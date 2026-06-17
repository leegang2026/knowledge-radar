from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional

from database import get_db, fetchone, fetchall
from auth import verify_api_key
from models import SourceCreate, SourceUpdate, SourceResponse

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[SourceResponse])
async def list_sources(status: Optional[str] = None):
    db = await get_db()
    try:
        where = ""
        params = []
        if status:
            where = "WHERE s.status = ?"
            params.append(status)

        rows = await fetchall(db,
            f"""SELECT s.*, COUNT(a.id) as article_count
                FROM sources s
                LEFT JOIN articles a ON a.source_id = s.id
                {where}
                GROUP BY s.id
                ORDER BY s.name""",
            params,
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("/sources", response_model=SourceResponse)
async def create_source(body: SourceCreate, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO sources (name, wechat_id, description, fetch_url, fetch_frequency_minutes) VALUES (?, ?, ?, ?, ?)",
            [body.name, body.wechat_id, body.description, body.fetch_url, body.fetch_frequency_minutes],
        )
        new_id = cursor.lastrowid
        await db.commit()
        row = await fetchone(db,
            "SELECT s.*, 0 as article_count FROM sources s WHERE s.id = ?",
            [new_id],
        )
        return dict(row)
    finally:
        await db.close()


@router.put("/sources/{source_id}", response_model=SourceResponse)
async def update_source(source_id: int, body: SourceUpdate, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        existing = await fetchone(db, "SELECT * FROM sources WHERE id = ?", [source_id])
        if not existing:
            raise HTTPException(404, "公众号不存在")

        updates = {}
        for k, v in body.model_dump(exclude_none=True).items():
            updates[k] = v
        updates["updated_at"] = None

        if updates:
            set_clause = ", ".join(
                f"{k} = ?" if k != "updated_at" else "updated_at = datetime('now')"
                for k in updates
            )
            values = [v for k, v in updates.items() if k != "updated_at"]
            await db.execute(
                f"UPDATE sources SET {set_clause} WHERE id = ?",
                values + [source_id],
            )
            await db.commit()

        row = await fetchone(db,
            "SELECT s.*, COUNT(a.id) as article_count FROM sources s LEFT JOIN articles a ON a.source_id = s.id WHERE s.id = ? GROUP BY s.id",
            [source_id],
        )
        return dict(row)
    finally:
        await db.close()


@router.delete("/sources/{source_id}")
async def delete_source(source_id: int, request: Request):
    verify_api_key(request)
    db = await get_db()
    try:
        await db.execute("DELETE FROM sources WHERE id = ?", [source_id])
        await db.commit()
        return {"message": "已删除"}
    finally:
        await db.close()


@router.get("/sources/search")
async def search_sources(q: str = Query(..., min_length=1)):
    db = await get_db()
    try:
        rows = await fetchall(db,
            "SELECT id, name, wechat_id, description, fetch_url FROM sources WHERE name LIKE ? LIMIT 10",
            [f"%{q}%"],
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()
