import { Article } from "../types";

interface Props {
  article: Article | null;
  onClose: () => void;
  onToggleRead: (id: number) => void;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso || "";
  }
}

// 匹配参考设计 .overlay + .detail-scroll
export default function ArticleDetailOverlay({ article, onClose, onToggleRead }: Props) {
  if (!article) return null;

  return (
    <div
      className="absolute inset-0 bg-white z-30 overflow-y-auto rounded-[24px]"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* 头部 — 匹配参考 .overlay-hdr: padding:6px 14px */}
      <div className="flex items-center" style={{ padding: "6px 14px", gap: "10px", borderBottom: "0.5px solid #F2F2F7" }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer text-[#07C160] bg-transparent border-0"
          style={{ width: "28px", height: "28px", fontSize: "18px" }}
        >
          ←
        </button>
        <span className="text-[15px] font-medium">文章详情</span>
      </div>

      {/* 标题区 — 匹配参考 .det-hdr: padding:14px 16px */}
      <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #F2F2F7" }}>
        {article.keyword_name && (
          <span className="inline-block text-[10px] bg-[#E8F8EE] text-[#07C160] rounded-[3px]" style={{ padding: "2px 6px", marginBottom: "6px" }}>
            {article.keyword_name}
          </span>
        )}
        <div className="text-[17px] font-medium leading-[1.4]" style={{ marginBottom: "8px" }}>{article.title}</div>
        <div className="text-[11px] text-[#8A8A8E]">
          {article.source_name} · {formatTime(article.published_at)}
        </div>
      </div>

      {/* 正文 — 匹配参考 .det-body: padding:14px 16px */}
      <div style={{ padding: "14px 16px" }}>
        <div className="text-[13px] text-[#444] leading-[1.8]" style={{ marginBottom: "14px" }}>
          {article.summary || "暂无摘要"}
        </div>

        <button
          onClick={() => onToggleRead(article.id)}
          className={`w-full font-medium cursor-pointer transition-colors rounded-lg border text-sm ${
            article.is_read
              ? "bg-[#07C160] text-white border-[#07C160]"
              : "bg-white text-[#07C160] border-[#07C160]"
          }`}
          style={{ padding: "12px", borderWidth: "0.5px", marginTop: "4px" }}
        >
          {article.is_read ? "✓ 已读" : "标记已读"}
        </button>

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center mt-3 no-underline text-sm font-medium bg-[#F2F2F7] text-[#555] rounded-lg"
            style={{ padding: "12px" }}
          >
            查看原文 ↗
          </a>
        )}
      </div>
    </div>
  );
}
