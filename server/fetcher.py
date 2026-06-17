"""RSS / Web 抓取引擎 — 从信息源拉取文章列表"""

import hashlib
import re
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup


class FetchedArticle:
    def __init__(self, title: str, url: str, content: str = "",
                 summary: Optional[str] = None, author: Optional[str] = None,
                 published_at: Optional[str] = None):
        self.title = title
        self.url = url
        self.content = content
        self.summary = summary
        self.author = author
        self.published_at = published_at

    @property
    def hash(self) -> str:
        return hashlib.sha256((self.title + self.url).encode("utf-8")).hexdigest()[:16]

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "content": self.content,
            "summary": self.summary,
            "author": self.author,
            "published_at": self.published_at,
        }


def _clean_html(html: str) -> str:
    """清洗 HTML 为纯文本"""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


def _parse_rss_date(date_str: Optional[str]) -> Optional[str]:
    """尝试解析 RSS 日期为标准 ISO 格式"""
    if not date_str:
        return None
    from email.utils import parsedate_to_datetime as parse_email_date
    try:
        dt = parse_email_date(date_str)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return None


async def fetch_rss(feed_url: str) -> List[FetchedArticle]:
    """拉取 RSS/Atom feed，返回文章列表"""
    try:
        import feedparser
    except ImportError:
        raise ImportError("请安装 feedparser: pip install feedparser")

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(feed_url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; KnowledgeRadar/1.0)",
        })
        resp.raise_for_status()

    feed = feedparser.parse(resp.text)
    articles: List[FetchedArticle] = []

    for entry in feed.entries[:20]:  # 每次最多 20 篇
        title = entry.get("title", "").strip()
        link = entry.get("link", "")
        summary_html = entry.get("summary", "") or entry.get("description", "")
        summary = _clean_html(summary_html)[:300] if summary_html else ""
        content_html = ""
        if "content" in entry:
            content_html = entry["content"][0].get("value", "")
        content = _clean_html(content_html or summary_html)[:5000]
        author = entry.get("author", "")
        published = _parse_rss_date(entry.get("published", ""))

        if title and link:
            articles.append(FetchedArticle(
                title=title, url=link, content=content,
                summary=summary or None, author=author or None,
                published_at=published,
            ))

    return articles


async def fetch_webpage(page_url: str) -> List[FetchedArticle]:
    """拉取网页，提取文本内容作为单篇文章"""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(page_url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; KnowledgeRadar/1.0)",
        })
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else page_url

    # 尝试提取正文
    article_tag = soup.find("article") or soup.find(class_=re.compile(r"(content|article|post|entry)", re.I))
    if article_tag:
        content = _clean_html(str(article_tag))[:5000]
    else:
        # 取 body 文本
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        body = soup.find("body")
        content = _clean_html(str(body))[:5000] if body else ""

    article = FetchedArticle(
        title=title, url=page_url, content=content,
        published_at=datetime.now(timezone.utc).isoformat(),
    )

    return [article] if article.content.strip() else []


async def fetch_source(source: dict) -> List[FetchedArticle]:
    """根据 source 配置拉取文章"""
    fetch_url = source.get("fetch_url")
    if not fetch_url:
        return []

    # 判断是 RSS 还是网页
    is_rss = any(fetch_url.endswith(ext) for ext in [".xml", ".rss", ".atom", "/feed", "/rss"])
    is_rss = is_rss or "rss" in fetch_url.lower() or "feed" in fetch_url.lower() or "atom" in fetch_url.lower()

    try:
        if is_rss:
            return await fetch_rss(fetch_url)
        else:
            return await fetch_webpage(fetch_url)
    except Exception as e:
        print(f"[fetcher] 抓取失败 {fetch_url}: {e}")
        return []
