"""AI 处理器 — 调用 OpenAI 兼容接口进行相关度评分和摘要生成"""

import json
import os
import httpx

AI_BASE_URL = os.getenv("RADAR_AI_BASE_URL", "https://api.deepseek.com/v1")
AI_API_KEY = os.getenv("RADAR_AI_API_KEY", "")
AI_MODEL = os.getenv("RADAR_AI_MODEL", "deepseek-chat")


async def test_connection(base_url: str, api_key: str, model: str) -> dict:
    """测试 AI API 连接，返回 {ok, message, model}"""
    if not api_key:
        return {"ok": False, "message": "API Key 未填写"}

    url = base_url.rstrip("/") + "/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "user", "content": "你好，请回复：连接成功"},
                    ],
                    "max_tokens": 20,
                    "temperature": 0,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"].strip()
                return {"ok": True, "message": reply, "model": data.get("model", model)}
            else:
                detail = resp.text[:200]
                return {"ok": False, "message": f"HTTP {resp.status_code}: {detail}"}
    except httpx.TimeoutException:
        return {"ok": False, "message": "连接超时，请检查 API 地址"}
    except Exception as e:
        return {"ok": False, "message": str(e)[:200]}

RELEVANCE_PROMPT = """你是一个文本语义相关度评估器。你需要根据给定的关键词描述，判断文章内容是否与该关键词相关。

评分标准（0-1，保留2位小数）：
- 0.9-1.0：文章核心主题直接匹配关键词描述的范围
- 0.7-0.89：文章有较大篇幅涉及关键词描述的领域
- 0.5-0.69：文章部分提及或涉及相关概念
- 0.3-0.49：文章仅简单提到，非主要内容
- 0.0-0.29：基本无关或仅词语巧合出现

只返回 0 到 1 之间的数字，不要返回任何解释。"""

SUMMARY_PROMPT = """你是一个专业的信息提炼助手。请根据文章内容生成一段简洁的中文摘要。

要求：
- 严格控制在 100 字以内
- 提炼文章核心观点和关键事实
- 包含关键数据、时间、主体信息
- 去除营销话术、修饰词和无关内容

直接返回摘要文本，不要添加任何前缀或引号。"""


async def _call_ai(system_prompt: str, user_content: str, max_tokens: int = 300) -> str:
    """调用 OpenAI 兼容接口"""
    if not AI_API_KEY:
        raise RuntimeError("未配置 RADAR_AI_API_KEY 环境变量")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{AI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.3,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


async def score_relevance(article_text: str, keyword_name: str, keyword_description: str = "") -> float:
    """评估文章与关键词的语义相关度，使用关键词描述提高精准度，返回 0-1 分数"""
    try:
        desc_part = f"\n关键词描述：{keyword_description}" if keyword_description else ""
        user_content = f"关键词：{keyword_name}{desc_part}\n\n文章内容：\n{article_text[:2000]}"
        result = await _call_ai(RELEVANCE_PROMPT, user_content)
        score = float(result)
        return max(0.0, min(1.0, score))
    except (ValueError, RuntimeError):
        return 0.45  # AI 不可用时保守降级


async def generate_summary(article_text: str) -> str:
    """生成 ≤100 字中文摘要"""
    try:
        summary = await _call_ai(SUMMARY_PROMPT, article_text[:3000])
        return summary[:100]
    except RuntimeError:
        clean = article_text.replace("\n", " ").strip()
        return clean[:100]
