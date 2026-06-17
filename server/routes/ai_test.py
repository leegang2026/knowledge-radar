from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["ai"])


class AITestRequest(BaseModel):
    base_url: str
    api_key: str
    model: str


@router.post("/ai/test")
async def test_ai(req: AITestRequest):
    """测试 AI API 连接"""
    from ai_processor import test_connection
    return await test_connection(req.base_url, req.api_key, req.model)
