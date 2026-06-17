export interface Source {
  id: number;
  name: string;
  url?: string | null;
  wechat_id: string | null;
  description: string | null;
  fetch_url?: string | null;
  fetch_frequency_minutes: number;
  status: string;
  last_fetched_at: string | null;
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: number;
  name: string;
  description?: string | null;
  relevance_threshold: number;
  is_active: number;
  tracking_count: number;
  hit_count_30d: number;
  created_at: string;
  updated_at: string;
}

export interface KeywordDetail extends Keyword {
  source_ids: number[];
}

export interface Article {
  id: number;
  source_id: number;
  source_name: string | null;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  is_read: number;
  relevance_score: number | null;
  keyword_id?: number;
  keyword_name?: string;
}

export interface ArticleListResponse {
  articles: Article[];
  total: number;
  offset: number;
  limit: number;
}

export interface SearchSuggestion {
  text: string;
  type: "history" | "hot";
}

export interface KeywordStat {
  keyword_id: number;
  keyword_name: string;
  hit_count: number;
  top_sources: string;
}
