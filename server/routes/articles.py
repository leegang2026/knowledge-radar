from fastapi import APIRouter, Request, Query
from typing import Optional

from database import get_db, fetchone, fetchall
from auth import verify_api_key
from models import ArticleListResponse, ArticleResponse

router = APIRouter(tags=["articles"])


@router.get("/articles", response_model=ArticleListResponse)
async def list_articles(
    keyword_id: Optional[int] = Query(None, description="按关键词筛选"),
    status: Optional[str] = Query("all", description="all | unread"),
    time_range: Optional[str] = Query(None, alias="time", description="today | 3d | 7d | 30d"),
    source_id: Optional[str] = Query(None, description="多选公众号，逗号分隔"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    db = await get_db()
    try:
        conditions = []
        params = []

        # 关键词筛选
        select_relevance = """(
            SELECT ak.relevance_score FROM article_keywords ak
            WHERE ak.article_id = a.id LIMIT 1
          ) as relevance_score,
          (
            SELECT ak.keyword_id FROM article_keywords ak
            WHERE ak.article_id = a.id LIMIT 1
          ) as keyword_id,
          (
            SELECT k.name FROM article_keywords ak
            JOIN keywords k ON k.id = ak.keyword_id
            WHERE ak.article_id = a.id LIMIT 1
          ) as keyword_name"""
        if keyword_id:
            conditions.append("EXISTS (SELECT 1 FROM article_keywords ak2 WHERE ak2.article_id = a.id AND ak2.keyword_id = ?)")
            params.append(keyword_id)
        join_clause = ""

        # 阅读状态
        if status == "unread":
            conditions.append("a.is_read = 0")

        # 时间范围
        time_filters = {
            "today": "-1 days",
            "3d": "-3 days",
            "7d": "-7 days",
            "30d": "-30 days",
        }
        if time_range and time_range in time_filters:
            conditions.append(f"a.published_at >= datetime('now', ?)")
            params.append(time_filters[time_range])

        # 来源多选
        if source_id:
            ids = [int(x) for x in source_id.split(",") if x.strip().isdigit()]
            if ids:
                placeholders = ",".join("?" * len(ids))
                conditions.append(f"a.source_id IN ({placeholders})")
                params.extend(ids)

        where = "WHERE " + " AND ".join(conditions) if conditions else ""

        # 总数
        count_sql = f"SELECT COUNT(*) as cnt FROM articles a {join_clause} {where}"
        total_row = await fetchone(db, count_sql, params)
        total = total_row["cnt"] if total_row else 0

        # 数据 — 未读在上，同状态按时间倒序
        order = "a.is_read ASC, a.published_at DESC"
        data_sql = f"""SELECT a.*, s.name as source_name,
                {select_relevance}
                FROM articles a
                LEFT JOIN sources s ON s.id = a.source_id
                {join_clause}
                {where}
                ORDER BY {order}
                LIMIT ? OFFSET ?"""
        rows = await fetchall(db, data_sql, params + [limit, offset])

        articles = [dict(r) for r in rows]
        return {"articles": articles, "total": total, "offset": offset, "limit": limit}
    finally:
        await db.close()


@router.put("/articles/{article_id}/read")
async def toggle_read(article_id: int, request: Request):
    """切换文章已读/未读状态"""
    verify_api_key(request)
    db = await get_db()
    try:
        row = await fetchone(db, "SELECT is_read FROM articles WHERE id = ?", [article_id])
        if not row:
            from fastapi import HTTPException
            raise HTTPException(404, "文章不存在")
        new_val = 0 if row["is_read"] else 1
        await db.execute("UPDATE articles SET is_read = ? WHERE id = ?", [new_val, article_id])
        await db.commit()
        return {"id": article_id, "is_read": new_val}
    finally:
        await db.close()
