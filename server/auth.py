"""API Key 鉴权 — 写操作需要。

- 仅在显式开启时启用：RADAR_AUTH_ENABLED=1 才校验 X-API-Key。
- 未启用鉴权时（默认 dev 模式）写操作不阻断，前端不需带 key。
- 启用时：RADAR_API_KEY 必须显式设置，且禁止使用已知的弱默认值。
"""

import os
from fastapi import Request, HTTPException

DEV_WEAK_KEYS = {"radar-dev-key", "changeme", "test", "dev"}

AUTH_ENABLED = os.getenv("RADAR_AUTH_ENABLED", "0") == "1"
API_KEY = os.getenv("RADAR_API_KEY", "")


def _validate_config() -> None:
    """启动时校验：启用鉴权就必须配强 key"""
    if not AUTH_ENABLED:
        return
    if not API_KEY:
        raise RuntimeError(
            "RADAR_AUTH_ENABLED=1 但 RADAR_API_KEY 未配置；请设置 RADAR_API_KEY 或关闭鉴权"
        )
    if API_KEY in DEV_WEAK_KEYS or len(API_KEY) < 16:
        raise RuntimeError(
            f"RADAR_API_KEY 太弱（={API_KEY[:4]}***），拒绝启动；请使用长度>=16 的随机串"
        )


# 模块导入即校验，失败直接抛错，让进程无法启动
_validate_config()


def verify_api_key(request: Request):
    """API Key 鉴权 — 仅在 AUTH_ENABLED=1 时生效"""
    if not AUTH_ENABLED:
        return
    key = request.headers.get("X-API-Key", "")
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
