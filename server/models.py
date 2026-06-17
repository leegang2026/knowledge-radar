from pydantic import BaseModel
from typing import Optional, List


# ========== Sources ==========

class SourceCreate(BaseModel):
    name: str
    wechat_id: Optional[str] = None
    description: Optional[str] = None
    fetch_url: Optional[str] = None
    fetch_frequency_minutes: Optional[int] = 480


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    wechat_id: Optional[str] = None
    description: Optional[str] = None
    fetch_url: Optional[str] = None
    fetch_frequency_minutes: Optional[int] = None
    status: Optional[str] = None


class SourceResponse(BaseModel):
    id: int
    name: str
    wechat_id: Optional[str] = None
    description: Optional[str] = None
    fetch_url: Optional[str] = None
    fetch_frequency_minutes: int = 480
    status: str
    last_fetched_at: Optional[str] = None
    article_count: int = 0
    created_at: str
    updated_at: str


# ========== Keywords ==========

class KeywordCreate(BaseModel):
    name: str
    description: Optional[str] = None
    relevance_threshold: int = 70
    source_ids: List[int] = []
    fetch_frequency_minutes: Optional[int] = None  # 应用于所选 sources


class KeywordUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    relevance_threshold: Optional[int] = None
    is_active: Optional[int] = None
    source_ids: Optional[List[int]] = None
    fetch_frequency_minutes: Optional[int] = None


class KeywordResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    relevance_threshold: int
    is_active: int
    tracking_count: int = 0
    hit_count_30d: int = 0
    created_at: str
    updated_at: str


class KeywordDetailResponse(KeywordResponse):
    source_ids: List[int] = []


# ========== Articles ==========

class ArticleResponse(BaseModel):
    id: int
    source_id: int
    source_name: Optional[str] = None
    title: str
    url: str
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    fetched_at: str
    is_read: int
    relevance_score: Optional[float] = None


class ArticleListResponse(BaseModel):
    articles: List[ArticleResponse]
    total: int
    offset: int
    limit: int


# ========== Search ==========

class SearchSuggestion(BaseModel):
    text: str
    type: str  # "history" | "hot"


# ========== Stats ==========

class KeywordStat(BaseModel):
    keyword_id: int
    keyword_name: str
    hit_count: int
    top_sources: str  # "公众号A（5篇）、公众号B（3篇）"


# ========== Cron / Fetch ==========

class FetchArticle(BaseModel):
    title: str
    url: str
    content: str
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None


class FetchWechatRequest(BaseModel):
    source_id: int
    posts: List[FetchArticle]


# ========== Generic ==========

class MessageResponse(BaseModel):
    message: str
