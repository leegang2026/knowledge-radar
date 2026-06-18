import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { Article, Source, Keyword } from "../types";
import ArticleCard from "../components/ArticleCard";
import FilterBar from "../components/FilterBar";
import ArticleDetailOverlay from "../components/ArticleDetailOverlay";

export default function Panel() {
  const api = useApi();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [timeFilter, setTimeFilter] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [currentKw, setCurrentKw] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, srcRes] = await Promise.all([
        api.get<Keyword[]>("/api/keywords"),
        api.get<Source[]>("/api/sources"),
      ]);
      setKeywords(kwRes);
      setSources(srcRes);
    } catch (e) {
      console.error("fetch keywords/sources:", e);
    }

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (timeFilter) params.set("time", timeFilter);
      if (selectedSourceIds.length > 0) params.set("source_id", selectedSourceIds.join(","));
      params.set("offset", "0");
      params.set("limit", "200");

      const res = await api.get<{ articles: Article[] }>(`/api/articles?${params.toString()}`);
      setArticles(res.articles);
    } catch (e) {
      console.error("fetch articles:", e);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, timeFilter, selectedSourceIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRead = async (id: number) => {
    try {
      await api.put(`/api/articles/${id}/read`, {});
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: a.is_read ? 0 : 1 } : a))
      );
    } catch (e) {
      console.error("toggle read:", e);
    }
  };

  const filtered = articles.filter((a) => {
    if (currentKw !== "all" && a.keyword_id?.toString() !== currentKw)
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read - b.is_read;
    return (b.published_at || "").localeCompare(a.published_at || "");
  });

  const getKwUnread = (kwId: number) =>
    articles.filter((a) => a.keyword_id === kwId && !a.is_read).length;

  return (
    <div>
      {/* 搜索栏 */}
      <div className="flex items-center" style={{ padding: "6px 14px" }}>
        {/* .c-sbar: padding:8px 12px */}
        <div
          className="flex-1 bg-[#F2F2F7] rounded-lg text-[13px] text-[#8A8A8E] flex items-center cursor-pointer border-0"
          style={{ padding: "8px 12px", gap: "6px" }}
          onClick={() => (window.location.hash = "#/search")}
        >
          🔍 关键词 / 文章标题
        </div>
      </div>

      {/* 关键词 pills — 匹配参考 .kw-scroll: padding:6px 14px 4px; gap:5px */}
      <div className="flex overflow-x-auto hide-scrollbar" style={{ padding: "6px 14px 4px", gap: "5px" }}>
        <button
          onClick={() => setCurrentKw("all")}
          className={`shrink-0 rounded-2xl cursor-pointer border-0 whitespace-nowrap transition-all duration-150 ${
            currentKw === "all"
              ? "bg-[#07C160] text-white font-medium"
              : "bg-[#F2F2F7] text-[#555]"
          }`}
          style={{ padding: "5px 12px", fontSize: "12px" }}
        >
          全部 <span className="text-[10px] opacity-60 ml-0.5">{articles.filter((a) => !a.is_read).length}</span>
        </button>
        {keywords.map((kw) => (
          <button
            key={kw.id}
            onClick={() => setCurrentKw(kw.id.toString())}
            className={`shrink-0 rounded-2xl cursor-pointer border-0 whitespace-nowrap transition-all duration-150 ${
              currentKw === kw.id.toString()
                ? "bg-[#07C160] text-white font-medium"
                : "bg-[#F2F2F7] text-[#555]"
            }`}
            style={{ padding: "5px 12px", fontSize: "12px" }}
          >
            {kw.name} <span className="text-[10px] opacity-60 ml-0.5">{getKwUnread(kw.id)}</span>
          </button>
        ))}
      </div>

      {/* 筛选栏 */}
      <FilterBar
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        statusFilter={statusFilter}
        timeFilter={timeFilter}
        onStatusChange={(v) => setStatusFilter(v)}
        onTimeChange={(v) => setTimeFilter(v)}
        onSourcesChange={(ids) => setSelectedSourceIds(ids)}
      />

      {/* 文章列表 — 匹配参考 .feed */}
      <div style={{ minHeight: "200px" }}>
        {loading ? (
          <div className="text-center text-[#C7C7CC] text-[13px]" style={{ padding: "60px 20px" }}>加载中...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center" style={{ padding: "60px 20px" }}>
            <div className="text-[40px] mb-2">📭</div>
            <div className="text-[13px] text-[#C7C7CC]">暂无文章</div>
          </div>
        ) : (
          sorted.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              onToggleRead={toggleRead}
              onClickDetail={(id) => { setDetailId(id); toggleRead(id); }}
            />
          ))
        )}
      </div>

      {/* 文章详情 Overlay */}
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
