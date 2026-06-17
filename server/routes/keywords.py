from fastapi import APIRouter, Request, HTTPException

from database import get_db, fetchone, fetchall
from auth import verify_api_key
from models import KeywordCreate, KeywordUpdate, KeywordResponse, KeywordDetailResponse

router = APIRouter(tags=["keywords"])


async def _keyword_row_to_response(row: dict, db) -> KeywordResponse:
    """将数据库行转为响应模型，补充 tracking_count 和 hit_count_30d"""
    kw_id = row["id"]
    tc = await fetchone(db,
        "SELECT COUNT(*) as cnt FROM keyword_sources WHERE keyword_id = ?", [kw_id]
    )
    hc = await fetchone(db,
        """SELECT COUNT(DISTINCT ak.article_id) as cnt
           FROM article_keywords ak
           JOIN articles a ON a.id = ak.article_id
           WHERE ak.keyword_id = ? AND a.created_at >= datetime('now', '-30 days')""",
        [kw_id],
    )
    return {
        **row,
        "tracking_count": tc["cnt"] if tc else 0,
        "hit_count_30d": hc["cnt"] if hc else 0,
    }


@router.get("/keywords", response_model=list[KeywordResponse])
async def list_keywords():
    db = await get_db()
    try:
        rows = await fetchall(db,
            "SELECT * FROM keywords ORDER BY created_at DESC"
        )
        result = []
        for r in rows:
            result.append(await _keyword_row_to_response(dict(r), db))
        return result
    finally:
        await db.close()


@router.get("/keywords/{keyword_id}", response_model=KeywordDetailResponse)
async def get_keyword(keyword_id: int):
    db = await get_db()
    try:
        row = await fetchone(db, "SELECT * FROM keywords WHERE id = ?", [keyword_id])
        if not row:
            raise HTTPException(404, "关键词不存在")
        base = await _keyword_row_to_response(dict(row), db)
        src_rows = await fetchall(db,
            "SELECT source_id FROM keyword_sources WHERE keyword_id = ?", [keyword_id]
        )
        base["source_ids"] = [s["source_id"] for s in src_rows]
        return base
    finally:
        await db.close()


@router.post("/keywords", response_model=KeywordResponse)
async def create_keyword(body: KeywordCreate, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO keywords (name, description, relevance_threshold) VALUES (?, ?, ?)",
            [body.name, body.description, body.relevance_threshold],
        )
        kw_id = cursor.lastrowid
        # 关联来源
        for sid in body.source_ids:
            await db.execute(
                "INSERT OR IGNORE INTO keyword_sources (keyword_id, source_id) VALUES (?, ?)",
                [kw_id, sid],
            )
        # 如果指定了 fetch_frequency_minutes，应用到关联的 sources
        if body.fetch_frequency_minutes is not None:
            for sid in body.source_ids:
                await db.execute(
                    "UPDATE sources SET fetch_frequency_minutes = ? WHERE id = ?",
                    [body.fetch_frequency_minutes, sid],
                )
        await db.commit()
        row = await fetchone(db, "SELECT * FROM keywords WHERE id = ?", [kw_id])
        return await _keyword_row_to_response(dict(row), db)
    finally:
        await db.close()


@router.put("/keywords/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(keyword_id: int, body: KeywordUpdate, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        existing = await fetchone(db, "SELECT * FROM keywords WHERE id = ?", [keyword_id])
        if not existing:
            raise HTTPException(404, "关键词不存在")

        field_updates = {}
        for k in ("name", "description", "relevance_threshold", "is_active"):
            v = getattr(body, k, None)
            if v is not None:
                field_updates[k] = v

        if field_updates:
            field_updates["updated_at"] = None
            set_clause = ", ".join(
                f"{k} = ?" if k != "updated_at" else "updated_at = datetime('now')"
                for k in field_updates
            )
            values = [v for k, v in field_updates.items() if k != "updated_at"]
            await db.execute(
                f"UPDATE keywords SET {set_clause} WHERE id = ?",
                values + [keyword_id],
            )

        # 更新来源关联
        if body.source_ids is not None:
            await db.execute("DELETE FROM keyword_sources WHERE keyword_id = ?", [keyword_id])
            for sid in body.source_ids:
                await db.execute(
                    "INSERT OR IGNORE INTO keyword_sources (keyword_id, source_id) VALUES (?, ?)",
                    [keyword_id, sid],
                )
        # 更新抓取频率到关联 sources
        if body.fetch_frequency_minutes is not None and body.source_ids is not None:
            for sid in body.source_ids:
                await db.execute(
                    "UPDATE sources SET fetch_frequency_minutes = ? WHERE id = ?",
                    [body.fetch_frequency_minutes, sid],
                )

        await db.commit()
        row = await fetchone(db, "SELECT * FROM keywords WHERE id = ?", [keyword_id])
        return await _keyword_row_to_response(dict(row), db)
    finally:
        await db.close()


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: int, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        await db.execute("DELETE FROM keywords WHERE id = ?", [keyword_id])
        await db.commit()
        return {"message": "已删除"}
    finally:
        await db.close()
