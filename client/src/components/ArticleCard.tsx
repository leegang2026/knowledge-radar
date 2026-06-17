import { ReactNode } from "react";

interface Props {
  article: {
    id: number;
    title: string;
    url: string;
    summary: string | null;
    source_name?: string | null;
    published_at?: string | null;
    is_read: number;
    relevance_score?: number | null;
    keyword_name?: string;
  };
  searchQuery?: string;
  onToggleRead: (id: number) => void;
  onClickDetail?: (id: number) => void;
}

const KEYWORD_COLORS: Record<string, string> = {
  "人工智能": "#07C160",
  "量化投资": "#FF9500",
  "产品设计": "#007AFF",
  "开源项目": "#5856D6",
  "金融监管": "#FF3B30",
};
const DEFAULT_COLORS = ["#07C160", "#FF9500", "#007AFF", "#5856D6", "#FF3B30", "#1D9E75", "#D4537E"];

function getDotColor(kwName?: string, id?: number): string {
  if (kwName && KEYWORD_COLORS[kwName]) return KEYWORD_COLORS[kwName];
  return DEFAULT_COLORS[(id ?? 0) % DEFAULT_COLORS.length];
}

function highlightText(text: string, query?: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

// 匹配参考设计 .ef-art: padding:7px 14px; gap:6px
export default function ArticleCard({
  article,
  searchQuery,
  onToggleRead,
  onClickDetail,
}: Props) {
  const dotColor = getDotColor(article.keyword_name, article.id);

  return (
    <div
      className={`flex items-start cursor-pointer transition-all duration-200 fade-in border-b ${
        article.is_read ? "article-read" : ""
      }`}
      style={{ padding: "7px 14px", gap: "6px", borderBottomColor: "#F2F2F7", borderBottomWidth: "0.5px" }}
      onClick={() => onClickDetail?.(article.id)}
    >
      {/* 左侧圆点 .ef-dot: 6x6; margin-top:6px */}
      <span
        className="ef-dot shrink-0 rounded-full"
        style={{ width: "6px", height: "6px", marginTop: "6px", background: dotColor }}
      />

      {/* 中间内容 .ef-bd */}
      <div className="flex-1 min-w-0">
        {/* .ef-r1: gap:5px; margin-bottom:1px */}
        <div className="flex items-center" style={{ gap: "5px", marginBottom: "1px" }}>
          <span className="text-[11px] text-[#8A8A8E]">{article.source_name}</span>
          <span className="text-[10px] text-[#C7C7CC]">{formatTime(article.published_at)}</span>
        </div>
        {/* .ef-tit: font-size:13px; line-height:1.35; margin-bottom:1px */}
        <div className="text-[13px] font-medium line-1" style={{ lineHeight: "1.35", marginBottom: "1px" }}>
          {highlightText(article.title, searchQuery)}
        </div>
        {/* .ef-desc: font-size:11px; line-height:1.35 */}
        {article.summary && (
          <div className="text-[11px] text-[#8A8A8E] line-1" style={{ lineHeight: "1.35" }}>
            {highlightText(article.summary, searchQuery)}
          </div>
        )}
      </div>

      {/* 右侧已读按钮 .ef-act: 28x28 */}
      <button
        className="shrink-0 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 border"
        style={{
          width: "28px",
          height: "28px",
          marginTop: "2px",
          color: article.is_read ? "#fff" : "#C7C7CC",
          background: article.is_read ? "#07C160" : "#fff",
          borderColor: article.is_read ? "#07C160" : "#E5E5E5",
          borderWidth: "0.5px",
          fontSize: "13px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleRead(article.id);
        }}
      >
        {article.is_read ? "✓" : "○"}
      </button>
    </div>
  );
}
