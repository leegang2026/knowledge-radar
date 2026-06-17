"""定时任务：RSS/Web 抓取 → AI 预筛选 → 入库"""

import hashlib
from fastapi import APIRouter, Request, HTTPException

from database import get_db, fetchone, fetchall
from auth import verify_api_key
from models import FetchWechatRequest, MessageResponse
from fetcher import fetch_source, FetchedArticle

router = APIRouter(tags=["cron"])


@router.get("/cron/fetch", response_model=MessageResponse)
async def cron_fetch_all(request: Request):
    """定时任务入口 — 遍历所有需要抓取的 sources，拉取 → AI 筛选 → 入库"""
    verify_api_key(request)

    db = await get_db()
    try:
        # 获取所有活跃的 sources
        sources = await fetchall(db,
            "SELECT * FROM sources WHERE status = 'active'"
        )
        sources = [dict(s) for s in sources]

        # 获取所有活跃的 keywords
        kw_rows = await fetchall(db,
            "SELECT * FROM keywords WHERE is_active = 1"
        )
        keywords = [dict(k) for k in kw_rows]

        if not keywords:
            return {"message": "没有活跃的关键词，跳过抓取"}
        if not sources:
            return {"message": "没有活跃的信息源，跳过抓取"}

        # 建立 keyword → sources 映射
        kw_source_map = {}
        for kw in keywords:
            ks_rows = await fetchall(db,
                "SELECT source_id FROM keyword_sources WHERE keyword_id = ?",
                [kw["id"]],
            )
            kw_source_map[kw["id"]] = [r["source_id"] for r in ks_rows]

        total_fetched = 0
        total_saved = 0
        total_skipped = 0

        for source in sources:
            fetch_url = source.get("fetch_url")
            if not fetch_url:
                continue

            # 抓取频率：距离上次抓取是否超过频率（用 SQL 计算时间差，避开 Python/SQLite 时区漂移）
            freq = source.get("fetch_frequency_minutes", 480)  # 默认 8 小时
            # freq>0 才做频率控制；freq<=0 视为"立即抓取"，常用于首次激活
            if freq > 0:
                freq_check = await fetchone(db,
                    """SELECT 1 FROM sources
                       WHERE id = ?
                         AND (
                           last_fetched_at IS NULL
                           OR (julianday('now') - julianday(last_fetched_at)) * 24 * 60 >= ?
                         )""",
                    [source["id"], freq],
                )
                if not freq_check:
                    continue  # 未到抓取时间

            # 从信息源拉取文章
            try:
                articles = await fetch_source(source)
            except Exception as e:
                print(f"[cron] 抓取 source {source['name']} 失败: {e}")
                continue

            for art in articles:
                total_fetched += 1

                # SHA-256 去重
                post_hash = art.hash

                existing = await fetchone(db,
                    "SELECT id FROM articles WHERE hash = ?", [post_hash]
                )
                if existing:
                    total_skipped += 1
                    continue

                # 入库文章（先不关联关键词）
                cursor = await db.execute(
                    """INSERT INTO articles (source_id, title, url, summary, content, author, published_at, hash)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    [
                        source["id"],
                        art.title,
                        art.url,
                        art.summary,
                        art.content,
                        art.author,
                        art.published_at,
                        post_hash,
                    ],
                )
                article_id = cursor.lastrowid

                # === AI 预筛选：用关键词描述判断相关度 ===
                from ai_processor import score_relevance, generate_summary

                ai_text = art.title + "\n" + (art.content or "")[:2000]
                matched = False

                for kw in keywords:
                    # 只检查追踪了该 source 的关键词
                    tracked_sources = kw_source_map.get(kw["id"], [])
                    if tracked_sources and source["id"] not in tracked_sources:
                        continue

                    threshold = kw.get("relevance_threshold", 70) / 100.0
                    description = kw.get("description", "") or ""

                    score = await score_relevance(ai_text, kw["name"], description)

                    if score >= threshold:
                        # 通过阈值：关联关键词
                        await db.execute(
                            "INSERT INTO article_keywords (article_id, keyword_id, relevance_score) VALUES (?, ?, ?)",
                            [article_id, kw["id"], round(score, 4)],
                        )
                        matched = True

                if matched:
                    # 生成 AI 摘要
                    if not art.summary:
                        summary = await generate_summary(ai_text)
                        await db.execute(
                            "UPDATE articles SET summary = ? WHERE id = ?",
                            [summary, article_id],
                        )
                    total_saved += 1
                else:
                    # 不通过任何关键词阈值 → 删除文章（不入库）
                    await db.execute("DELETE FROM articles WHERE id = ?", [article_id])

            # 更新最后抓取时间
            await db.execute(
                "UPDATE sources SET last_fetched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                [source["id"]],
            )
            await db.commit()

        return {
            "message": f"抓取 {total_fetched} 篇，入库 {total_saved} 篇，跳过重复 {total_skipped} 篇，"
                       f"AI 筛除 {total_fetched - total_saved - total_skipped} 篇不相关"
        }
    finally:
        await db.close()


@router.post("/cron/fetch-wechat", response_model=MessageResponse)
async def receive_fetch(request: Request, body: FetchWechatRequest):
    """接收外部推送的公众号文章数据（兼容旧接口）"""
    verify_api_key(request)

    db = await get_db()
    try:
        source = await fetchone(db, "SELECT * FROM sources WHERE id = ?", [body.source_id])
        if not source:
            raise HTTPException(404, "公众号来源不存在")

        kw_rows = await fetchall(db,
            "SELECT k.* FROM keywords k JOIN keyword_sources ks ON ks.keyword_id = k.id WHERE ks.source_id = ? AND k.is_active = 1",
            [body.source_id],
        )
        keywords = [dict(r) for r in kw_rows]

        saved = 0
        skipped_dup = 0

        for post in body.posts:
            post_hash = hashlib.sha256(
                (post.title + post.url).encode("utf-8")
            ).hexdigest()[:16]

            existing = await fetchone(db,
                "SELECT id FROM articles WHERE hash = ?", [post_hash]
            )
            if existing:
                skipped_dup += 1
                continue

            cursor = await db.execute(
                """INSERT INTO articles (source_id, title, url, summary, content, author, published_at, hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    body.source_id, post.title, post.url, post.summary,
                    post.content, post.author, post.published_at, post_hash,
                ],
            )
            article_id = cursor.lastrowid

            from ai_processor import score_relevance, generate_summary

            ai_text = post.title + "\n" + (post.content or "")[:2000]
            matched = False

            for kw in keywords:
                threshold = kw["relevance_threshold"] / 100.0
                description = kw.get("description", "") or ""
                score = await score_relevance(ai_text, kw["name"], description)

                if score >= threshold:
                    await db.execute(
                        "INSERT INTO article_keywords (article_id, keyword_id, relevance_score) VALUES (?, ?, ?)",
                        [article_id, kw["id"], round(score, 4)],
                    )
                    matched = True

            if matched:
                if not post.summary:
                    summary = await generate_summary(ai_text)
                    await db.execute(
                        "UPDATE articles SET summary = ? WHERE id = ?",
                        [summary, article_id],
                    )
                saved += 1
            else:
                await db.execute("DELETE FROM articles WHERE id = ?", [article_id])

        await db.execute(
            "UPDATE sources SET last_fetched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
            [body.source_id],
        )
        await db.commit()

        return {"message": f"已处理 {len(body.posts)} 篇文章，入库 {saved} 篇，跳过重复 {skipped_dup} 篇"}
    finally:
        await db.close()
