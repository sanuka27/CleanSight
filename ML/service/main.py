import os
import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from .schemas import PredictionResponse
from .model_loader import load_model, predict_image
from typing import Optional
import httpx
import logging

app = FastAPI(title="CleanSight ML Phase 1 - Binary Validation")

def _is_private_ip(hostname: str) -> bool:
    \"\"\"
    Resolve the hostname and check if any of the resulting IPs are in a private
    or otherwise non-public range (loopback, link-local, multicast, etc.).
    \"\"\"
    try:
        addrinfos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Invalid image URL host")
        
    for family, _, _, _, sockaddr in addrinfos:
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
            
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            return True
    return False

def validate_image_url(image_url: str) -> str:
    \"\"\"
    Validate that the provided image URL uses http/https and does not resolve
    to a private or otherwise disallowed IP range.
    \"\"\"
    parsed = urlparse(image_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid image URL")
        
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid image URL host")
        
    if _is_private_ip(hostname):
        raise HTTPException(status_code=400, detail="Image URL host is not allowed")
        
    return image_url

# Load model on startup
@app.on_event("startup")
async def startup_event():
    load_model()

@app.post("/predict", response_model=PredictionResponse)
async def predict_endpoint(image: Optional[UploadFile] = File(None), image_url: Optional[str] = Form(None)):
    \"\"\"
    Accepts an image file or an image URL to download.
    Provides real prediction using the loaded Phase 1 model.
    \"\"\"
    logging.info(f"Received prediction request. URL: {image_url}")
    
    try:
        image_bytes = None
        
        if image:
            image_bytes = await image.read()
        elif image_url:
            safe_url = validate_image_url(image_url)
            MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
            try:
                # Disable redirects and stream the file dynamically preventing SSRF re-bind
                async with httpx.AsyncClient() as client:
                    async with client.stream("GET", safe_url, timeout=10.0, follow_redirects=False) as response:
                        
                        network_stream = response.extensions.get("network_stream") if hasattr(response, "extensions") else None
                        if network_stream is not None:
                            peername = network_stream.get_extra_info("peername")
                            if peername:
                                peer_ip = peername[0]
                                try:
                                    peer_ip_obj = ipaddress.ip_address(peer_ip)
                                    if peer_ip_obj.is_private or peer_ip_obj.is_loopback or peer_ip_obj.is_link_local or peer_ip_obj.is_reserved or peer_ip_obj.is_multicast:
                                        raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")
                                except ValueError:
                                    raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")

                        if response.status_code != 200:
                            raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")
                        
                        content_type = response.headers.get("content-type", "")
                        if not content_type.lower().startswith("image/"):
                            raise HTTPException(status_code=400, detail="URL does not point to a valid image")

                        data = bytearray()
                        async for chunk in response.aiter_bytes():
                            if not chunk:
                                break
                            data.extend(chunk)
                            if len(data) > MAX_IMAGE_SIZE:
                                raise HTTPException(status_code=400, detail="Image too large")
                                
                        image_bytes = bytes(data)

            except httpx.RequestError:
                raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")
        else:
            raise HTTPException(status_code=400, detail="Must provide 'image' file or 'image_url'")
            
        label, confidence = predict_image(image_bytes)
        
        # Decide recommendation (Confidence threshold: 0.70)
        THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.70))
        recommendation = "automated_approval" if confidence >= THRESHOLD else "manual_review"
        
        return PredictionResponse(
            label=label,
            confidence=confidence,
            recommendation=recommendation
        )
        
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=f"Model service unavailable: {str(re)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal service error: {str(e)}")

# Add a simple health check
@app.get("/health")
def health_endpoint():
    return {"status": "ok"}
