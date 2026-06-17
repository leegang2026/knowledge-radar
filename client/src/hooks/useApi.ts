import { useMemo } from "react";
import {
  MOCK_ARTICLES,
  MOCK_SOURCES,
  MOCK_KEYWORDS,
  MOCK_STATS,
  MOCK_SUGGESTIONS,
} from "../mock-data";

const API_KEY = "radar-dev-key";
const USE_MOCK = false; // 设为 false 连接真实后端

// Mock 帮助函数
let mockArticles = [...MOCK_ARTICLES];
let mockSources = [...MOCK_SOURCES];
let mockKeywords = [...MOCK_KEYWORDS];

function getMockData<T>(url: string): T {
  // GET /api/sources
  if (url === "/api/sources" || url.startsWith("/api/sources?")) return mockSources as T;
  // GET /api/keywords
  if (url === "/api/keywords" || url.startsWith("/api/keywords?")) return mockKeywords as T;
  // GET /api/stats
  if (url === "/api/stats") return MOCK_STATS as T;
  // GET /api/search/suggestions
  if (url === "/api/search/suggestions") return MOCK_SUGGESTIONS as T;
  // GET /api/articles
  if (url.startsWith("/api/articles?")) {
    const params = new URLSearchParams(url.split("?")[1]);
    let result = [...mockArticles];
    if (params.get("status") === "unread") result = result.filter((a) => !a.is_read);
    if (params.get("time") === "today") result = result.filter((a) => Date.now() - new Date(a.published_at || "").getTime() < 86400000);
    if (params.get("time") === "7d") result = result.filter((a) => Date.now() - new Date(a.published_at || "").getTime() < 7 * 86400000);
    if (params.get("time") === "30d") result = result.filter((a) => Date.now() - new Date(a.published_at || "").getTime() < 30 * 86400000);
    if (params.get("source_id")) {
      const ids = params.get("source_id")!.split(",").map(Number);
      result = result.filter((a) => ids.includes(a.source_id));
    }
    return { articles: result, total: result.length, offset: 0, limit: 200 } as T;
  }
  // GET /api/search?q=...
  if (url.startsWith("/api/search?")) {
    const params = new URLSearchParams(url.split("?")[1]);
    const q = (params.get("q") || "").toLowerCase();
    let result = mockArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary || "").toLowerCase().includes(q) ||
        (a.keyword_name || "").includes(q) ||
        (a.source_name || "").toLowerCase().includes(q)
    );
    return { articles: result, total: result.length } as T;
  }
  return [] as T;
}

function mockPost<T>(url: string, body: unknown): T {
  // POST /api/sources
  if (url === "/api/sources") {
    const b = body as { name: string; wechat_id?: string; description?: string; url?: string; fetch_url?: string; fetch_frequency_minutes?: number };
    const newSource = {
      id: Math.max(...mockSources.map((s) => s.id), 0) + 1,
      name: b.name,
      url: b.url || null,
      wechat_id: b.wechat_id || null,
      description: b.description || null,
      fetch_url: b.fetch_url || null,
      fetch_frequency_minutes: b.fetch_frequency_minutes || 480,
      status: "active",
      last_fetched_at: null,
      article_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSources.push(newSource);
    return newSource as T;
  }
  // POST /api/keywords
  if (url === "/api/keywords") {
    const b = body as { name: string; description?: string; relevance_threshold: number; source_ids: number[]; fetch_frequency_minutes?: number };
    const newKw = {
      id: Math.max(...mockKeywords.map((k) => k.id), 100) + 1,
      name: b.name,
      description: b.description || null,
      relevance_threshold: b.relevance_threshold || 70,
      is_active: 1,
      tracking_count: (b.source_ids || []).length,
      hit_count_30d: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockKeywords.push(newKw);
    return newKw as T;
  }
  return {} as T;
}

function mockPut(url: string, body: unknown): void {
  // PUT /api/articles/:id/read
  const readMatch = url.match(/\/api\/articles\/(\d+)\/read/);
  if (readMatch) {
    const id = parseInt(readMatch[1]);
    const article = mockArticles.find((a) => a.id === id);
    if (article) article.is_read = article.is_read ? 0 : 1;
    return;
  }
  // PUT /api/keywords/:id
  const kwMatch = url.match(/\/api\/keywords\/(\d+)/);
  if (kwMatch) {
    const id = parseInt(kwMatch[1]);
    const kw = mockKeywords.find((k) => k.id === id);
    if (kw) {
      const b = body as { name?: string; relevance_threshold?: number };
      if (b.name) kw.name = b.name;
      if (b.relevance_threshold != null) kw.relevance_threshold = b.relevance_threshold;
    }
    return;
  }
  // PUT /api/sources/:id
  const srcMatch = url.match(/\/api\/sources\/(\d+)/);
  if (srcMatch) {
    const id = parseInt(srcMatch[1]);
    const src = mockSources.find((s) => s.id === id);
    if (src) {
      const b = body as { status?: string };
      if (b.status) src.status = b.status;
    }
    return;
  }
}

function mockDelete(url: string): void {
  // DELETE /api/keywords/:id
  const kwMatch = url.match(/\/api\/keywords\/(\d+)/);
  if (kwMatch) {
    mockKeywords = mockKeywords.filter((k) => k.id !== parseInt(kwMatch[1]));
    return;
  }
  // DELETE /api/sources/:id
  const srcMatch = url.match(/\/api\/sources\/(\d+)/);
  if (srcMatch) {
    mockSources = mockSources.filter((s) => s.id !== parseInt(srcMatch[1]));
    return;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK) {
    const method = options?.method || "GET";
    if (method === "GET") return getMockData<T>(url);
    if (method === "POST") return mockPost<T>(url, JSON.parse((options?.body as string) || "{}"));
    if (method === "PUT") { mockPut(url, JSON.parse((options?.body as string) || "{}")); return undefined as T; }
    if (method === "DELETE") { mockDelete(url); return undefined as T; }
    return [] as T;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options?.headers as Record<string, string>),
  };

  const resp = await fetch(url, { ...options, headers });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `${resp.status} ${resp.statusText}`);
  }

  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export function useApi() {
  return useMemo(() => ({
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body: unknown) =>
      request<T>(url, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(url: string, body: unknown) =>
      request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
    delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  }), []);
}
