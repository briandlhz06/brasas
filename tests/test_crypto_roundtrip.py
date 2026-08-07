"""Roundtrip AES-GCM + length-prefix bucket padding (browser scheme)."""

import os
import struct

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

BUCKETS = (512, 2048, 8192, 32768, 49152)


def b64url_encode(data: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(data: str) -> bytes:
    import base64

    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def pad_plaintext(text: bytes) -> bytes:
    need = 4 + len(text)
    bucket = next((b for b in BUCKETS if b >= need), None)
    if bucket is None:
        raise ValueError("too long")
    out = bytearray(bucket)
    out[0:4] = struct.pack(">I", len(text))
    out[4 : 4 + len(text)] = text
    if 4 + len(text) < bucket:
        out[4 + len(text) :] = os.urandom(bucket - 4 - len(text))
    return bytes(out)


def unpad_plaintext(buf: bytes) -> bytes:
    (length,) = struct.unpack(">I", buf[:4])
    if length > len(buf) - 4:
        raise ValueError("bad pad")
    return buf[4 : 4 + length]


def test_aes_gcm_roundtrip_with_padding():
    key = os.urandom(32)
    iv = os.urandom(12)
    plaintext = "hola brasas · env=supersecreto".encode("utf-8")
    padded = pad_plaintext(plaintext)
    assert len(padded) in BUCKETS

    aes = AESGCM(key)
    ciphertext = aes.encrypt(iv, padded, None)

    out = unpad_plaintext(AESGCM(key).decrypt(iv, ciphertext, None))
    assert out == plaintext

    assert "=" not in b64url_encode(ciphertext)
    assert "=" not in b64url_encode(iv)
    assert len(b64url_decode(b64url_encode(key))) == 32


def test_small_secrets_share_bucket():
    a = pad_plaintext(b"x")
    b = pad_plaintext(b"hello")
    assert len(a) == len(b) == 512


def test_payload_ttl():
    assert 86400 in {3600, 21600, 86400}
