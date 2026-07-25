"""
Unit tests for ML/service/image_input.py

Tests:
  - _is_disallowed_ip: IP address classification
  - _validate_image_url: URL scheme/hostname validation
  - extract_image_bytes: upload vs URL paths, size limits, empty payload

All network calls are mocked — no real HTTP requests are made.
"""

from __future__ import annotations

import ipaddress
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from ML.service.image_input import (
    _is_disallowed_ip,
    _validate_image_url,
    extract_image_bytes,
)


# ── _is_disallowed_ip ─────────────────────────────────────────────────────────

class TestIsDisallowedIp:
    """Tests for the IP-address classification helper."""

    def test_loopback_ipv4_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("127.0.0.1")) is True

    def test_loopback_ipv6_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("::1")) is True

    def test_private_class_a_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("10.0.0.1")) is True

    def test_private_class_b_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("172.16.0.1")) is True

    def test_private_class_c_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("192.168.1.1")) is True

    def test_link_local_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("169.254.0.1")) is True

    def test_multicast_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("224.0.0.1")) is True

    def test_unspecified_is_disallowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("0.0.0.0")) is True

    def test_public_ip_is_allowed(self):
        # 8.8.8.8 is Google's public DNS — not private, loopback, etc.
        assert _is_disallowed_ip(ipaddress.ip_address("8.8.8.8")) is False

    def test_another_public_ip_is_allowed(self):
        assert _is_disallowed_ip(ipaddress.ip_address("93.184.216.34")) is False

    def test_public_ipv6_is_allowed(self):
        # 2001:4860:4860::8888 is Google's public IPv6 DNS
        assert _is_disallowed_ip(ipaddress.ip_address("2001:4860:4860::8888")) is False


# ── _validate_image_url ───────────────────────────────────────────────────────

class TestValidateImageUrl:
    """Tests for URL scheme + SSRF guard validation."""

    def _patch_private(self, is_private: bool):
        return patch("ML.service.image_input._is_private_ip", return_value=is_private)

    def test_valid_https_url_is_returned_unchanged(self):
        url = "https://storage.googleapis.com/bucket/image.jpg"
        with self._patch_private(False):
            result = _validate_image_url(url)
        assert result == url

    def test_valid_http_url_is_accepted(self):
        url = "http://example.com/image.png"
        with self._patch_private(False):
            result = _validate_image_url(url)
        assert result == url

    def test_ftp_scheme_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_image_url("ftp://example.com/image.jpg")
        assert exc_info.value.status_code == 400
        assert "Invalid image URL" in exc_info.value.detail

    def test_empty_netloc_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_image_url("https://")
        assert exc_info.value.status_code == 400

    def test_private_ip_host_raises_400(self):
        with self._patch_private(True):
            with pytest.raises(HTTPException) as exc_info:
                _validate_image_url("https://192.168.1.1/image.jpg")
        assert exc_info.value.status_code == 400
        assert "not allowed" in exc_info.value.detail

    def test_loopback_host_raises_400(self):
        with self._patch_private(True):
            with pytest.raises(HTTPException) as exc_info:
                _validate_image_url("http://127.0.0.1/image.jpg")
        assert exc_info.value.status_code == 400

    def test_public_firebase_storage_url_passes(self):
        url = "https://firebasestorage.googleapis.com/v0/b/bucket/o/img.jpg?alt=media"
        with self._patch_private(False):
            result = _validate_image_url(url)
        assert result == url


# ── extract_image_bytes — UploadFile path ─────────────────────────────────────

class TestExtractImageBytesUpload:
    """Tests for the file-upload branch of extract_image_bytes."""

    def _make_upload(self, content: bytes, filename: str = "test.jpg") -> UploadFile:
        """Build a minimal UploadFile-like mock."""
        upload = MagicMock(spec=UploadFile)
        upload.read = AsyncMock(return_value=content)
        upload.filename = filename
        return upload

    @pytest.mark.asyncio
    async def test_valid_upload_returns_bytes(self, jpeg_bytes):
        upload = self._make_upload(jpeg_bytes)
        result = await extract_image_bytes(
            image=upload,
            image_url=None,
            max_image_bytes=10 * 1024 * 1024,
        )
        assert result == jpeg_bytes

    @pytest.mark.asyncio
    async def test_empty_upload_raises_400(self):
        upload = self._make_upload(b"")
        with pytest.raises(HTTPException) as exc_info:
            await extract_image_bytes(
                image=upload,
                image_url=None,
                max_image_bytes=10 * 1024 * 1024,
            )
        assert exc_info.value.status_code == 400
        assert "empty" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_oversized_upload_raises_400(self):
        large_content = b"X" * 1001
        upload = self._make_upload(large_content)
        with pytest.raises(HTTPException) as exc_info:
            await extract_image_bytes(
                image=upload,
                image_url=None,
                max_image_bytes=1000,  # 1KB limit for this test
            )
        assert exc_info.value.status_code == 400
        assert "too large" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_upload_takes_precedence_over_url(self, jpeg_bytes):
        """When both image and image_url are provided, the upload wins."""
        upload = self._make_upload(jpeg_bytes)
        # url would fail if called, but it should never be reached
        result = await extract_image_bytes(
            image=upload,
            image_url="http://example.com/img.jpg",
            max_image_bytes=10 * 1024 * 1024,
        )
        assert result == jpeg_bytes


# ── extract_image_bytes — URL path ────────────────────────────────────────────

class TestExtractImageBytesUrl:
    """Tests for the URL-download branch of extract_image_bytes."""

    @pytest.mark.asyncio
    async def test_no_image_and_no_url_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            await extract_image_bytes(
                image=None,
                image_url=None,
                max_image_bytes=10 * 1024 * 1024,
            )
        assert exc_info.value.status_code == 400
        assert "must provide" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_invalid_scheme_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            await extract_image_bytes(
                image=None,
                image_url="ftp://example.com/img.jpg",
                max_image_bytes=10 * 1024 * 1024,
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_successful_url_download_returns_bytes(self, jpeg_bytes):
        """Mock the HTTP client to return a successful image response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.extensions = {}

        # aiter_bytes yields one chunk then stops
        async def _aiter_bytes():
            yield jpeg_bytes

        mock_response.aiter_bytes = _aiter_bytes
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("ML.service.image_input._is_private_ip", return_value=False), \
             patch("ML.service.image_input.httpx.AsyncClient", return_value=mock_client):
            result = await extract_image_bytes(
                image=None,
                image_url="https://example.com/img.jpg",
                max_image_bytes=10 * 1024 * 1024,
            )

        assert result == jpeg_bytes

    @pytest.mark.asyncio
    async def test_non_200_response_raises_400(self):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.headers = {"content-type": "text/html"}
        mock_response.extensions = {}
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("ML.service.image_input._is_private_ip", return_value=False), \
             patch("ML.service.image_input.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                await extract_image_bytes(
                    image=None,
                    image_url="https://example.com/missing.jpg",
                    max_image_bytes=10 * 1024 * 1024,
                )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_non_image_content_type_raises_400(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "text/html; charset=utf-8"}
        mock_response.extensions = {}
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("ML.service.image_input._is_private_ip", return_value=False), \
             patch("ML.service.image_input.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                await extract_image_bytes(
                    image=None,
                    image_url="https://example.com/not-an-image",
                    max_image_bytes=10 * 1024 * 1024,
                )
        assert exc_info.value.status_code == 400
        assert "valid image" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_oversized_url_image_raises_400(self):
        """Streaming download that exceeds max_image_bytes should raise 400."""
        large_chunk = b"X" * 2000

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.extensions = {}

        async def _aiter_bytes():
            yield large_chunk

        mock_response.aiter_bytes = _aiter_bytes
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("ML.service.image_input._is_private_ip", return_value=False), \
             patch("ML.service.image_input.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                await extract_image_bytes(
                    image=None,
                    image_url="https://example.com/large.jpg",
                    max_image_bytes=1000,  # 1KB limit
                )
        assert exc_info.value.status_code == 400
        assert "too large" in exc_info.value.detail.lower()
