import json
import os
import secrets
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from redis import Redis
from starlette.middleware.base import BaseHTTPMiddleware

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
KEY_PREFIX = "brasas:"
ALLOWED_TTL = {3600, 21600, 86400}
MAX_CIPHERTEXT_CHARS = 96_000

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = CSP
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        path = request.url.path
        if (
            path == "/"
            or path.startswith("/r/")
            or path.startswith("/static/js/")
            or path.endswith(".html")
        ):
            response.headers["Cache-Control"] = "no-store"
        return response


app = FastAPI(title="brasas", docs_url=None, redoc_url=None)
app.add_middleware(SecurityHeaders)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(REDIS_URL, decode_responses=True)
    return _redis


class CreateSecret(BaseModel):
    ciphertext: str = Field(min_length=1, max_length=MAX_CIPHERTEXT_CHARS)
    iv: str = Field(min_length=1, max_length=64)
    ttl: int = 86400


class SecretPayload(BaseModel):
    ciphertext: str
    iv: str


@app.get("/api/health")
def health():
    try:
        get_redis().ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {"status": "ok" if redis_ok else "degraded", "redis": redis_ok}


@app.post("/api/secrets")
def create_secret(body: CreateSecret):
    if body.ttl not in ALLOWED_TTL:
        raise HTTPException(status_code=400, detail="ttl no permitido")

    secret_id = secrets.token_urlsafe(16)
    payload = json.dumps(
        {"ciphertext": body.ciphertext, "iv": body.iv},
        separators=(",", ":"),
    )
    if len(payload.encode("utf-8")) > MAX_CIPHERTEXT_CHARS + 64:
        raise HTTPException(status_code=413, detail="payload demasiado grande")

    r = get_redis()
    r.setex(f"{KEY_PREFIX}{secret_id}", body.ttl, payload)
    return {"id": secret_id}


@app.get("/api/secrets/{secret_id}")
def get_secret(secret_id: str):
    if not secret_id or len(secret_id) > 64:
        raise HTTPException(status_code=404, detail="no encontrado")

    r = get_redis()
    key = f"{KEY_PREFIX}{secret_id}"
    raw = r.getdel(key)
    if raw is None:
        raise HTTPException(status_code=404, detail="quemado o expirado")

    try:
        data = json.loads(raw)
        return SecretPayload(ciphertext=data["ciphertext"], iv=data["iv"])
    except (json.JSONDecodeError, KeyError, TypeError):
        raise HTTPException(status_code=500, detail="dato corrupto")


@app.get("/")
def index():
    return FileResponse(
        STATIC_DIR / "index.html",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/r/{secret_id}")
def read_page(secret_id: str):
    return FileResponse(
        STATIC_DIR / "read.html",
        headers={"Cache-Control": "no-store"},
    )
