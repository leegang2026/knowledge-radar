import { Source } from "../types";

interface Props {
  sources: Source[];
  selectedSourceIds: number[];
  statusFilter: "all" | "unread";
  timeFilter: string;
  onStatusChange: (v: "all" | "unread") => void;
  onTimeChange: (v: string) => void;
  onSourcesChange: (ids: number[]) => void;
  showSources?: boolean;
}

const TIME_OPTIONS = [
  { value: "", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
];

// 匹配参考设计 .filter-bar: padding:4px 14px 6px; gap:5px
export default function FilterBar({
  sources,
  selectedSourceIds,
  statusFilter,
  timeFilter,
  onStatusChange,
  onTimeChange,
  onSourcesChange,
  showSources = false,
}: Props) {
  return (
    <div className="flex overflow-x-auto hide-scrollbar" style={{ padding: "4px 14px 6px", gap: "5px" }}>
      {/* 状态筛选 — .f-pill: padding:3px 9px; font-size:10px */}
      {(["all", "unread"] as const).map((s) => (
        <button
          key={s}
          onClick={() => onStatusChange(s)}
          className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
            statusFilter === s
              ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium"
              : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
          }`}
          style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}
        >
          {s === "all" ? "全部" : "仅未读"}
        </button>
      ))}

      {/* 分隔线 — .f-divider */}
      <span className="shrink-0 bg-[#E5E5E5]" style={{ width: "1px", margin: "2px 3px" }} />

      {/* 时间筛选 */}
      {TIME_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onTimeChange(o.value)}
          className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
            timeFilter === o.value
              ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium"
              : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
          }`}
          style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}
        >
          {o.label}
        </button>
      ))}

      {/* 来源筛选 (可选) */}
      {showSources && sources.length > 0 && (
        <>
          <span className="shrink-0 bg-[#E5E5E5]" style={{ width: "1px", margin: "2px 3px" }} />
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                const next = selectedSourceIds.includes(s.id)
                  ? selectedSourceIds.filter((id) => id !== s.id)
                  : [...selectedSourceIds, s.id];
                onSourcesChange(next);
              }}
              className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
                selectedSourceIds.includes(s.id)
                  ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium"
                  : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
              }`}
              style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}
            >
              {s.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
