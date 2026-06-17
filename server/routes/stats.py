from fastapi import APIRouter

from database import get_db, fetchone, fetchall
from models import KeywordStat

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=list[KeywordStat])
async def get_stats():
    db = await get_db()
    try:
        rows = await fetchall(db, 
            """SELECT
                k.id as keyword_id,
                k.name as keyword_name,
                COUNT(DISTINCT ak.article_id) as hit_count
               FROM keywords k
               LEFT JOIN article_keywords ak ON ak.keyword_id = k.id
               LEFT JOIN articles a ON a.id = ak.article_id
                  AND a.created_at >= datetime('now', '-30 days')
               WHERE k.is_active = 1
               GROUP BY k.id
               ORDER BY hit_count DESC"""
        )

        result = []
        for r in rows:
            # 每个关键词的主要来源
            src_rows = await fetchall(db, 
                """SELECT s.name, COUNT(ak.article_id) as cnt
                   FROM article_keywords ak
                   JOIN articles a ON a.id = ak.article_id
                   JOIN sources s ON s.id = a.source_id
                   WHERE ak.keyword_id = ?
                     AND a.created_at >= datetime('now', '-30 days')
                   GROUP BY s.id
                   ORDER BY cnt DESC
                   LIMIT 5""",
                [r["keyword_id"]],
            )

            top = "、".join(
                f"{s['name']}（{s['cnt']}篇）" for s in src_rows if s["cnt"] > 0
            ) or "暂无"

            result.append({
                "keyword_id": r["keyword_id"],
                "keyword_name": r["keyword_name"],
                "hit_count": r["hit_count"] or 0,
                "top_sources": top,
            })

        return result
    finally:
        await db.close()
