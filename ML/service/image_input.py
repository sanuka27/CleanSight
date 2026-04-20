"""Shared request image extraction and URL safety validation."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, UploadFile


_ALLOWED_SCHEMES = {"http", "https"}


def _is_disallowed_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
    )


def _is_private_ip(hostname: str) -> bool:
    """Return True when hostname resolves to a non-public IP range."""
    try:
        addrinfos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="Invalid image URL host") from exc

    for _, _, _, _, sockaddr in addrinfos:
        ip_text = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_text)
        except ValueError:
            continue

        if _is_disallowed_ip(ip_obj):
            return True

    return False


def _validate_image_url(image_url: str) -> str:
    parsed = urlparse(image_url)
    if parsed.scheme not in _ALLOWED_SCHEMES or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid image URL")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid image URL host")

    if _is_private_ip(hostname):
        raise HTTPException(status_code=400, detail="Image URL host is not allowed")

    return image_url


async def _download_image_bytes(image_url: str, max_image_bytes: int) -> bytes:
    safe_url = _validate_image_url(image_url)

    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "GET",
                safe_url,
                timeout=10.0,
                follow_redirects=False,
            ) as response:
                network_stream = response.extensions.get("network_stream") if hasattr(response, "extensions") else None
                if network_stream is not None:
                    peer_name = network_stream.get_extra_info("peername")
                    if peer_name:
                        try:
                            peer_ip = ipaddress.ip_address(peer_name[0])
                        except ValueError as exc:
                            raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL") from exc
                        if _is_disallowed_ip(peer_ip):
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
                    if len(data) > max_image_bytes:
                        raise HTTPException(status_code=400, detail="Image too large")

                if not data:
                    raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL")

                return bytes(data)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=400, detail="Could not retrieve image from provided URL") from exc


async def extract_image_bytes(
    image: UploadFile | None,
    image_url: str | None,
    max_image_bytes: int,
) -> bytes:
    """Extract image bytes from upload or URL with consistent validation."""
    if image is not None:
        payload = await image.read()
        if not payload:
            raise HTTPException(status_code=400, detail="Uploaded image is empty")
        if len(payload) > max_image_bytes:
            raise HTTPException(status_code=400, detail="Image too large")
        return payload

    if image_url:
        return await _download_image_bytes(image_url, max_image_bytes)

    raise HTTPException(status_code=400, detail="Must provide 'image' file or 'image_url'")
