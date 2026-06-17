import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { KeywordStat, Keyword, Source } from "../types";

const KEYWORD_DOTS: Record<string, string> = {
  "人工智能": "#07C160",
  "量化投资": "#FF9500",
  "产品设计": "#007AFF",
  "开源项目": "#5856D6",
  "金融监管": "#FF3B30",
};
const DEFAULT_DOTS = ["#07C160", "#FF9500", "#007AFF", "#5856D6", "#FF3B30", "#1D9E75", "#D4537E"];

function getDotColor(name: string, index: number): string {
  return KEYWORD_DOTS[name] || DEFAULT_DOTS[index % DEFAULT_DOTS.length];
}

export default function Stats() {
  const api = useApi();
  const [stats, setStats] = useState<KeywordStat[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [st, kw, src] = await Promise.all([
          api.get<KeywordStat[]>("/api/stats"),
          api.get<Keyword[]>("/api/keywords"),
          api.get<Source[]>("/api/sources"),
        ]);
        setStats(st);
        setKeywords(kw);
        setSourceCount(src.length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const totalArticles = stats.reduce((sum, s) => sum + s.hit_count, 0);
  const sorted = [...stats].sort((a, b) => b.hit_count - a.hit_count);

  if (loading) {
    return <div className="text-center text-[#C7C7CC] text-[13px]" style={{ padding: "60px 20px" }}>加载中...</div>;
  }

  return (
    <div>
      {/* 统计卡片网格 — 匹配参考 .stats-grid: gap:10px; padding:12px 14px */}
      <div className="grid grid-cols-2" style={{ padding: "12px 14px", gap: "10px" }}>
        <div className="bg-[#F9F9FB] rounded-[10px]" style={{ padding: "12px" }}>
          <div className="text-[22px] font-medium text-[#18191C] leading-[1.2]">
            {keywords.length}
          </div>
          <div className="text-[11px] text-[#8A8A8E] mt-0.5">订阅关键词</div>
        </div>
        <div className="bg-[#F9F9FB] rounded-[10px]" style={{ padding: "12px" }}>
          <div className="text-[22px] font-medium text-[#18191C] leading-[1.2]">
            {totalArticles}
          </div>
          <div className="text-[11px] text-[#8A8A8E] mt-0.5">本月入库文章</div>
        </div>
        <div className="bg-[#F9F9FB] rounded-[10px]" style={{ padding: "12px" }}>
          <div className="text-[22px] font-medium text-[#18191C] leading-[1.2]">
            {sourceCount}
          </div>
          <div className="text-[11px] text-[#8A8A8E] mt-0.5">追踪公众号</div>
        </div>
        <div className="bg-[#F9F9FB] rounded-[10px]" style={{ padding: "12px" }}>
          <div className="text-[22px] font-medium text-[#18191C] leading-[1.2]">
            68%
          </div>
          <div className="text-[11px] text-[#8A8A8E] mt-0.5">阅读完成率</div>
        </div>
      </div>

      {/* 关键词命中排行 — 匹配参考 .stat-table: padding:0 14px 12px */}
      <div className="text-xs font-medium text-[#555]" style={{ margin: "6px 14px 4px" }}>
        关键词命中排行（近 30 天）
      </div>
      <div style={{ padding: "0 14px 12px" }}>
        {sorted.length === 0 ? (
          <div className="text-center text-[#C7C7CC] text-[13px]" style={{ padding: "40px 0" }}>
            暂无统计数据
          </div>
        ) : (
          sorted.map((s, i) => {
            const dotColor = getDotColor(s.keyword_name, i);
            return (
              <div
                key={s.keyword_id}
                className="flex items-start justify-between text-[13px]"
                style={{ padding: "10px 0", borderBottom: i < sorted.length - 1 ? "0.5px solid #F2F2F7" : "none" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center" style={{ gap: "6px", marginBottom: "3px" }}>
                    <span
                      className="shrink-0 rounded-full"
                      style={{ width: "8px", height: "8px", background: dotColor }}
                    />
                    <span className="text-[13px] font-medium">{s.keyword_name}</span>
                  </div>
                  <div className="text-[10px] text-[#8A8A8E] leading-[1.4]" style={{ marginLeft: "14px" }}>
                    {s.top_sources}
                  </div>
                </div>
                <span className="font-medium text-[#07C160] text-[15px] shrink-0" style={{ marginLeft: "8px" }}>
                  {s.hit_count}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
