import os
from fastapi import Request, HTTPException

API_KEY = os.getenv("RADAR_API_KEY", "radar-dev-key")


def verify_api_key(request: Request):
    """API Key 鉴权 — 写操作需要"""
    key = request.headers.get("X-API-Key", "")
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
