from fastapi import APIRouter, Query
from typing import Optional

from database import get_db, fetchone, fetchall
from models import ArticleListResponse, SearchSuggestion

router = APIRouter(tags=["search"])


@router.get("/search", response_model=ArticleListResponse)
async def search_articles(
    q: str = Query(..., min_length=1),
    status: Optional[str] = Query("all"),
    time_range: Optional[str] = Query(None, alias="time"),
    source_id: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    db = await get_db()
    try:
        conditions = [
            "(a.title LIKE ? OR a.summary LIKE ?)",
        ]
        params = [f"%{q}%", f"%{q}%"]

        if status == "unread":
            conditions.append("a.is_read = 0")

        time_filters = {
            "today": "-1 days",
            "3d": "-3 days",
            "7d": "-7 days",
            "30d": "-30 days",
        }
        if time_range and time_range in time_filters:
            conditions.append("a.published_at >= datetime('now', ?)")
            params.append(time_filters[time_range])

        if source_id:
            ids = [int(x) for x in source_id.split(",") if x.strip().isdigit()]
            if ids:
                placeholders = ",".join("?" * len(ids))
                conditions.append(f"a.source_id IN ({placeholders})")
                params.extend(ids)

        where = "WHERE " + " AND ".join(conditions)

        # 总数
        total_row = await fetchone(db, 
            f"SELECT COUNT(*) as cnt FROM articles a {where}", params
        )
        total = total_row["cnt"] if total_row else 0

        # 搜索排序：相关度降序（标题匹配权重更高），同相关度按时间倒序
        order = """ORDER BY
            CASE WHEN a.title LIKE ? THEN 2
                 WHEN a.summary LIKE ? THEN 1
                 ELSE 0 END DESC,
            a.published_at DESC"""
        search_params = [f"%{q}%", f"%{q}%"]
        all_params = params + search_params + [limit, offset]

        rows = await fetchall(db,
            f"""SELECT a.*, s.name as source_name,
                (SELECT ak.relevance_score FROM article_keywords ak WHERE ak.article_id = a.id LIMIT 1) as relevance_score,
                (SELECT ak.keyword_id FROM article_keywords ak WHERE ak.article_id = a.id LIMIT 1) as keyword_id,
                (SELECT k.name FROM article_keywords ak JOIN keywords k ON k.id = ak.keyword_id WHERE ak.article_id = a.id LIMIT 1) as keyword_name
                FROM articles a
                LEFT JOIN sources s ON s.id = a.source_id
                {where}
                {order}
                LIMIT ? OFFSET ?""",
            all_params,
        )

        articles = [dict(r) for r in rows]

        # 记录搜索历史
        await db.execute(
            "INSERT INTO search_history (query) VALUES (?)", [q]
        )
        await db.execute(
            """DELETE FROM search_history
               WHERE id NOT IN (SELECT id FROM search_history ORDER BY searched_at DESC LIMIT 5)"""
        )
        await db.commit()

        return {"articles": articles, "total": total, "offset": offset, "limit": limit}
    finally:
        await db.close()


@router.get("/search/suggestions", response_model=list[SearchSuggestion])
async def search_suggestions():
    db = await get_db()
    try:
        # 最近搜索历史（最多5条）
        history_rows = await fetchall(db, 
            "SELECT query FROM search_history ORDER BY searched_at DESC LIMIT 5"
        )
        suggestions = []
        for r in history_rows:
            suggestions.append({"text": r["query"], "type": "history"})

        # 热门关键词（近30天命中数最多的关键词名）
        hot_rows = await fetchall(db, 
            """SELECT k.name FROM keywords k
               JOIN article_keywords ak ON ak.keyword_id = k.id
               JOIN articles a ON a.id = ak.article_id
               WHERE a.created_at >= datetime('now', '-30 days')
               GROUP BY k.id
               ORDER BY COUNT(*) DESC
               LIMIT 5"""
        )
        for r in hot_rows:
            if {"text": r["name"], "type": "hot"} not in suggestions:
                suggestions.append({"text": r["name"], "type": "hot"})

        return suggestions[:5]
    finally:
        await db.close()
