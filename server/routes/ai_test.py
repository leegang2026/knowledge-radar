from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from database import get_db, fetchone

router = APIRouter(tags=["ai"])


class AITestRequest(BaseModel):
    base_url: str
    api_key: str
    model: str


class AIConfigSave(BaseModel):
    base_url: str
    api_key: str
    model: str


@router.post("/ai/test")
async def test_ai(req: AITestRequest):
    """测试 AI API 连接"""
    from ai_processor import test_connection
    return await test_connection(req.base_url, req.api_key, req.model)


@router.post("/ai/config")
async def save_ai_config(req: AIConfigSave):
    """保存 AI 配置到数据库（前端首次配置入口）"""
    db = await get_db()
    try:
        for k, v in {
            "ai_base_url": req.base_url,
            "ai_api_key": req.api_key,
            "ai_model": req.model,
        }.items():
            await db.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
                [k, v],
            )
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.get("/ai/config")
async def get_ai_config():
    """获取当前 AI 配置"""
    db = await get_db()
    try:
        keys = ["ai_base_url", "ai_api_key", "ai_model"]
        result = {}
        for k in keys:
            row = await fetchone(db, "SELECT value FROM settings WHERE key = ?", [k])
            result[k] = row["value"] if row else None
        return {"configured": result["ai_api_key"] is not None, "base_url": result["ai_base_url"], "model": result["ai_model"]}
    finally:
        await db.close()
