import aiosqlite
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "knowledge_radar.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    wechat_id TEXT UNIQUE,
    description TEXT,
    fetch_url TEXT,
    fetch_frequency_minutes INTEGER DEFAULT 480,
    status TEXT DEFAULT 'active',
    last_fetched_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    relevance_threshold INTEGER DEFAULT 70,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keyword_sources (
    keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (keyword_id, source_id)
);

CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER REFERENCES sources(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    author TEXT,
    published_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    is_read INTEGER DEFAULT 0,
    hash TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS article_keywords (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
    relevance_score REAL,
    PRIMARY KEY (article_id, keyword_id)
);

CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    searched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_keywords_kw ON article_keywords(keyword_id, relevance_score);
"""

# 增量迁移（兼容旧表）
MIGRATIONS = [
    "ALTER TABLE sources ADD COLUMN fetch_url TEXT",
    "ALTER TABLE sources ADD COLUMN fetch_frequency_minutes INTEGER DEFAULT 480",
    "ALTER TABLE keywords ADD COLUMN description TEXT",
]


async def get_db():
    """获取数据库连接，自动启用外键约束"""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db


async def fetchone(db, sql, params=None):
    """执行 SQL 并返回单行"""
    cursor = await db.execute(sql, params or [])
    return await cursor.fetchone()


async def fetchall(db, sql, params=None):
    """执行 SQL 并返回多行"""
    cursor = await db.execute(sql, params or [])
    return await cursor.fetchall()


async def run_migrations(db):
    """执行增量迁移，忽略列已存在的错误"""
    for migration in MIGRATIONS:
        try:
            await db.execute(migration)
        except Exception:
            pass  # 列已存在
    await db.commit()


async def init_db():
    """初始化数据库表结构并执行迁移"""
    db = await get_db()
    try:
        for stmt in SCHEMA.split(";"):
            stmt = stmt.strip()
            if stmt:
                await db.execute(stmt)
        await db.commit()
        await run_migrations(db)
    finally:
        await db.close()
