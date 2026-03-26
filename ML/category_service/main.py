"""
CleanSight ML Phase 2 - Category Classification Service (FastAPI)

Provides REST API for waste category prediction (glass, mixed, paper, plastic).

Run with: uvicorn ML.category_service.main:app --host 0.0.0.0 --port 8001
"""

import os
import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from typing import Optional
import httpx
import logging

from .schemas import CategoryPredictionResponse, CategoryPrediction
from .model_loader import load_model, predict_category

app = FastAPI(
    title="CleanSight ML Phase 2 - Category Classification",
    description="Waste category classification service (glass, mixed, paper, plastic)",
    version="1.0.0"
)


def _is_private_ip(hostname: str) -> bool:
    """Check if hostname resolves to private IP."""
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
    """Validate image URL for security."""
    parsed = urlparse(image_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid image URL")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid image URL host")

    if _is_private_ip(hostname):
        raise HTTPException(status_code=400, detail="Image URL host is not allowed")

    return image_url


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    load_model()


@app.post("/predict-category", response_model=CategoryPredictionResponse)
async def predict_category_endpoint(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None)
):
    """
    Predict waste category from image file or URL.

    Returns predicted category (glass, mixed, paper, plastic) with confidence,
    entropy-based uncertainty, and all class predictions.
    """
    logging.info(f"Category prediction request. URL: {image_url}")

    try:
        image_bytes = None

        if image:
            image_bytes = await image.read()
        elif image_url:
            safe_url = validate_image_url(image_url)
            MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

            try:
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "GET", safe_url, timeout=10.0, follow_redirects=False
                    ) as response:
                        # SSRF protection: check peer IP
                        network_stream = response.extensions.get("network_stream") if hasattr(response, "extensions") else None
                        if network_stream is not None:
                            peername = network_stream.get_extra_info("peername")
                            if peername:
                                peer_ip = peername[0]
                                try:
                                    peer_ip_obj = ipaddress.ip_address(peer_ip)
                                    if (
                                        peer_ip_obj.is_private
                                        or peer_ip_obj.is_loopback
                                        or peer_ip_obj.is_link_local
                                        or peer_ip_obj.is_reserved
                                        or peer_ip_obj.is_multicast
                                    ):
                                        raise HTTPException(
                                            status_code=400,
                                            detail="Could not retrieve image from provided URL"
                                        )
                                except ValueError:
                                    raise HTTPException(
                                        status_code=400,
                                        detail="Could not retrieve image from provided URL"
                                    )

                        if response.status_code != 200:
                            raise HTTPException(
                                status_code=400,
                                detail="Could not retrieve image from provided URL"
                            )

                        content_type = response.headers.get("content-type", "")
                        if not content_type.lower().startswith("image/"):
                            raise HTTPException(
                                status_code=400,
                                detail="URL does not point to a valid image"
                            )

                        data = bytearray()
                        async for chunk in response.aiter_bytes():
                            if not chunk:
                                break
                            data.extend(chunk)
                            if len(data) > MAX_IMAGE_SIZE:
                                raise HTTPException(
                                    status_code=400,
                                    detail="Image too large"
                                )

                        image_bytes = bytes(data)

            except httpx.RequestError:
                raise HTTPException(
                    status_code=400,
                    detail="Could not retrieve image from provided URL"
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide 'image' file or 'image_url'"
            )

        # Run prediction
        result = predict_category(image_bytes)

        if not result["success"]:
            return CategoryPredictionResponse(
                success=False,
                error=result.get("error", "Prediction failed")
            )

        # Build all_predictions list
        all_preds = [
            CategoryPrediction(
                class_name=p["class_name"],
                confidence=p["confidence"]
            )
            for p in result.get("all_predictions", [])
        ]

        return CategoryPredictionResponse(
            success=True,
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            entropy=result["entropy"],
            confidence_level=result["confidence_level"],
            all_predictions=all_preds
        )

    except HTTPException:
        raise
    except RuntimeError as re:
        raise HTTPException(
            status_code=503,
            detail=f"Category model service unavailable: {str(re)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal service error: {str(e)}"
        )


@app.get("/health")
def health_endpoint():
    """Health check endpoint."""
    return {"status": "ok", "service": "category-classification"}
