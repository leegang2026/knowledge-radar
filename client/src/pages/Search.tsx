import { useState, useCallback, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { Article, SearchSuggestion } from "../types";
import ArticleCard from "../components/ArticleCard";
import ArticleDetailOverlay from "../components/ArticleDetailOverlay";

const HOT_SUGGESTIONS: SearchSuggestion[] = [
  { text: "GPT-6", type: "hot" },
  { text: "量化交易", type: "hot" },
  { text: "AI 应用", type: "hot" },
];
const RECENT_SUGGESTIONS: SearchSuggestion[] = [
  { text: "模型训练成本", type: "history" },
  { text: "多因子模型", type: "history" },
];

export default function Search() {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => { fetchSuggestions(); }, []);
  const fetchSuggestions = async () => {
    try {
      const s = await api.get<SearchSuggestion[]>("/api/search/suggestions");
      if (s && s.length > 0) setSuggestions(s);
    } catch {
      // use defaults
    }
  };

  const allSuggestions =
    suggestions.length > 0
      ? suggestions
      : [...HOT_SUGGESTIONS, ...RECENT_SUGGESTIONS];

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      params.set("q", q.trim());
      params.set("offset", "0");
      params.set("limit", "200");
      const res = await api.get<{ articles: Article[] }>(`/api/search?${params.toString()}`);
      setArticles(res.articles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRead = async (id: number) => {
    try {
      await api.put(`/api/articles/${id}/read`, {});
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: a.is_read ? 0 : 1 } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const showSuggestions = !query.trim();

  return (
    <div>
      {/* 搜索栏 — 匹配参考 .overlay-hdr: padding:6px 14px */}
      <div className="flex items-center" style={{ padding: "6px 14px", gap: "10px" }}>
        {/* .ov-sbar: padding:7px 10px */}
        <div className="flex-1 bg-[#F2F2F7] rounded-lg text-[13px] flex items-center" style={{ padding: "7px 10px", gap: "6px" }}>
          <input
            className="flex-1 border-0 bg-transparent outline-none text-[13px]"
            placeholder="搜索文章、关键词..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={fetchSuggestions}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch(query);
            }}
          />
          {query && (
            <span
              className="text-[#C7C7CC] cursor-pointer"
              onClick={() => {
                setQuery("");
                setSearched(false);
                setArticles([]);
              }}
            >
              ✕
            </span>
          )}
        </div>
      </div>

      {/* 建议区 — 匹配参考 #searchSuggest: padding:6px 14px */}
      {showSuggestions && !searched && (
        <div style={{ padding: "6px 14px" }}>
          <div className="text-[11px] text-[#C7C7CC] mb-[6px]">搜索建议（热门 + 最近）</div>
          {allSuggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center cursor-pointer text-[13px] text-[#555]"
              style={{
                padding: "8px 0",
                gap: "10px",
                borderBottom: i < allSuggestions.length - 1 ? "0.5px solid #F2F2F7" : "none",
              }}
              onClick={() => {
                setQuery(s.text);
                doSearch(s.text);
              }}
            >
              {s.type === "hot" ? (
                <span className="bg-[#FFF3E0] text-[#FF9500] text-[10px] shrink-0" style={{ padding: "0 5px", borderRadius: "3px" }}>
                  热门
                </span>
              ) : (
                <span className="text-[#C7C7CC] text-xs shrink-0">最近</span>
              )}
              {s.text}
            </div>
          ))}
        </div>
      )}

      {/* 搜索结果 */}
      {loading ? (
        <div className="text-center text-[#C7C7CC] text-[13px]" style={{ padding: "60px 20px" }}>搜索中...</div>
      ) : searched ? (
        articles.length === 0 ? (
          <div className="text-center" style={{ padding: "40px 0" }}>
            <div className="text-[40px] mb-2">🔍</div>
            <div className="text-[13px] text-[#C7C7CC]">未找到相关文章</div>
          </div>
        ) : (
          <>
            <div className="text-[11px] text-[#C7C7CC] mb-[6px]" style={{ padding: "0 14px" }}>
              找到 {articles.length} 条结果
            </div>
            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                searchQuery={query}
                onToggleRead={toggleRead}
                onClickDetail={(id) => setDetailId(id)}
              />
            ))}
          </>
        )
      ) : null}

      {detailId != null && (
        <ArticleDetailOverlay
          article={articles.find((a) => a.id === detailId) || null}
          onClose={() => setDetailId(null)}
          onToggleRead={(id) => {
            toggleRead(id);
          }}
        />
      )}
    </div>
  );
}
