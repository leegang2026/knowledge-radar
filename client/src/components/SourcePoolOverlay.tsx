import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { Source } from "../types";

const POOL_COLORS = [
  "#07C160", "#FF9500", "#007AFF", "#5856D6", "#FF3B30",
  "#1D9E75", "#D4537E", "#BA7517", "#378ADD", "#639922", "#7F77DD",
];

// 匹配参考设计 .overlay + #poolOverlay
export default function SourcePoolOverlay({ onClose }: { onClose: () => void }) {
  const api = useApi();
  const [sources, setSources] = useState<Source[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQ, setSearchQ] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFetchUrl, setEditFetchUrl] = useState("");
  const [editFreq, setEditFreq] = useState(480);

  const fetchSources = useCallback(async () => {
    try {
      const data = await api.get<Source[]>("/api/sources");
      setSources(data);
    } catch (e) {
      console.error(e);
    }
  }, [api]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const filtered = sources.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "inactive" && s.status === "active") return false;
    if (searchQ && !s.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const poolColor = (idx: number) => POOL_COLORS[idx % POOL_COLORS.length];

  const handleAdd = async () => {
    const name = searchQ.trim();
    if (!name) return;
    if (sources.some((s) => s.name === name)) {
      alert(`「${name}」已在池中`);
      return;
    }
    try {
      await api.post("/api/sources", {
        name,
        url: newSourceUrl.trim() || undefined,
        fetch_url: newSourceUrl.trim() || undefined,
      });
      setSearchQ("");
      setNewSourceUrl("");
      setShowAddForm(false);
      fetchSources();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchImport = async () => {
    const names = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    let added = 0,
      skipped = 0;
    for (const name of names) {
      if (sources.some((s) => s.name === name)) {
        skipped++;
        continue;
      }
      try {
        await api.post("/api/sources", { name });
        added++;
      } catch (e) {
        console.error(e);
      }
    }
    alert(`成功添加 ${added} 个公众号${skipped ? `，跳过 ${skipped} 个已存在的` : ""}`);
    setBatchText("");
    setBatchOpen(false);
    fetchSources();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确认将「${name}」移出公众号池？`)) return;
    try {
      await api.delete(`/api/sources/${id}`);
      fetchSources();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (s: Source) => {
    setEditingId(s.id);
    setEditFetchUrl(s.fetch_url || s.url || "");
    setEditFreq(s.fetch_frequency_minutes || 480);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    try {
      await api.put(`/api/sources/${editingId}`, {
        fetch_url: editFetchUrl || undefined,
        fetch_frequency_minutes: editFreq,
      });
      setEditingId(null);
      fetchSources();
    } catch (e) {
      console.error(e);
    }
  };

  const normalCount = sources.filter((s) => s.status === "active").length;
  const warnCount = sources.filter((s) => s.status !== "active").length;

  return (
    <div
      className="absolute inset-0 bg-white z-30 overflow-y-auto rounded-[24px]"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* 头部 — .overlay-hdr: padding:6px 14px */}
      <div className="flex items-center" style={{ padding: "6px 14px", gap: "10px", borderBottom: "0.5px solid #F2F2F7" }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer text-[#07C160] bg-transparent border-0"
          style={{ width: "28px", height: "28px", fontSize: "18px" }}
        >
          ←
        </button>
        <span className="text-[15px] font-medium">公众号池</span>
      </div>

      {/* 搜索栏 — .pool-search-row: padding:8px 14px */}
      <div style={{ padding: "8px 14px" }}>
        {/* .pool-search-bar: padding:7px 10px */}
        <div className="flex items-center bg-[#F2F2F7] rounded-lg" style={{ padding: "7px 10px", gap: "6px" }}>
          <input
            className="flex-1 border-0 bg-transparent outline-none text-[13px]"
            placeholder="搜索公众号名称..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <button
            onClick={() => { setShowAddForm(!showAddForm); setNewSourceUrl(""); }}
            className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer whitespace-nowrap"
            style={{ padding: "4px 10px", fontSize: "11px" }}
          >
            添加
          </button>
        </div>

        {/* 添加表单 */}
        {showAddForm && (
          <div className="bg-white rounded-xl border shadow-sm" style={{ padding: "10px", marginTop: "8px", borderColor: "#E5E5E5", borderWidth: "0.5px" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
              添加「{searchQ || "新公众号"}」
            </div>
            <input
              className="w-full border rounded px-2 py-[6px] text-[13px] outline-none mb-2"
              style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
              placeholder="抓取地址（RSS feed 或网页 URL）"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
            />
            <div className="text-[10px] text-[#C7C7CC] mb-2">
              填写 RSS feed 地址或网页 URL，留空则仅记录名称
            </div>
            <div className="flex justify-end" style={{ gap: "8px" }}>
              <button
                onClick={() => { setShowAddForm(false); setNewSourceUrl(""); }}
                className="bg-[#F2F2F7] border-0 rounded-md cursor-pointer"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                确认添加
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setBatchOpen(!batchOpen)}
          className="w-full text-center text-[11px] text-[#07C160] cursor-pointer border-0 bg-transparent"
          style={{ padding: "5px 0", marginTop: "4px" }}
        >
          批量导入名称列表...
        </button>

        {/* 批量导入弹窗 — .pool-batch-modal */}
        {batchOpen && (
          <div className="bg-white rounded-xl border shadow-lg" style={{ padding: "14px", marginBottom: "8px", borderColor: "#E5E5E5", borderWidth: "0.5px" }}>
            <div className="text-xs font-medium" style={{ marginBottom: "6px" }}>批量导入公众号</div>
            <textarea
              className="w-full rounded-lg text-xs resize-none outline-none"
              style={{ height: "80px", padding: "8px", border: "0.5px solid #E5E5E5" }}
              placeholder={"每行一个公众号名称\n例如：\n机器之心\n华尔街见闻\n36氪"}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
            />
            <div className="flex justify-end" style={{ gap: "8px", marginTop: "8px" }}>
              <button
                onClick={() => setBatchOpen(false)}
                className="bg-[#F2F2F7] border-0 rounded-md cursor-pointer"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                取消
              </button>
              <button
                onClick={handleBatchImport}
                className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                批量添加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 统计 — .pool-stats-row: padding:8px 14px 4px */}
      <div className="flex" style={{ padding: "8px 14px 4px", gap: "10px" }}>
        <span className="flex items-center text-[11px] text-[#8A8A8E]" style={{ gap: "4px" }}>
          共 <span className="font-medium text-[#18191C]">{sources.length}</span> 个
        </span>
        <span className="flex items-center text-[11px] text-[#8A8A8E]" style={{ gap: "4px" }}>
          正常 <span className="font-medium text-[#18191C]">{normalCount}</span>
        </span>
        {warnCount > 0 && (
          <span className="flex items-center text-[11px] text-[#FF9500]" style={{ gap: "4px" }}>
            疑似停更 <span className="font-medium">{warnCount}</span>
          </span>
        )}
      </div>

      {/* 筛选 — .filter-bar */}
      <div className="flex overflow-x-auto hide-scrollbar" style={{ padding: "2px 14px 6px", gap: "5px" }}>
        {([
          ["all", "全部"],
          ["active", "正常"],
          ["inactive", "疑似停更"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
              filter === val
                ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium"
                : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
            }`}
            style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 列表 — .pool-list: padding:0 14px */}
      <div style={{ padding: "0 14px" }}>
        {filtered.length === 0 ? (
          <div className="text-center text-[13px] text-[#C7C7CC]" style={{ padding: "40px 0" }}>没有匹配的公众号</div>
        ) : (
          filtered.map((s) => {
            const idx = sources.indexOf(s);
            const isWarn = s.status !== "active";
            return (
              <React.Fragment key={s.id}>
              <div
                key={s.id}
                className="flex items-center"
                style={{ padding: "10px 0", gap: "10px", borderBottom: "0.5px solid #F2F2F7" }}
              >
                {/* .pool-avatar: 40x40 */}
                <div
                  className="rounded-full shrink-0 flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: "40px", height: "40px", background: poolColor(idx) }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center" style={{ gap: "6px", marginBottom: "2px" }}>
                    <span className="text-[13px] font-medium">{s.name}</span>
                    <span
                      className="text-[9px] font-medium rounded-[3px]"
                      style={{
                        padding: "1px 5px",
                        background: isWarn ? "#FFF3E0" : "#E8F8EE",
                        color: isWarn ? "#FF9500" : "#07C160",
                      }}
                    >
                      {isWarn ? "疑似停更" : "正常"}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8A8A8E] flex" style={{ gap: "10px" }}>
                    <span>近30天 {s.article_count} 篇</span>
                    <span style={isWarn ? { color: "#FF9500" } : {}}>
                      最后更新 {s.last_fetched_at ? s.last_fetched_at.slice(0, 10) : "待抓取"}
                    </span>
                  </div>
                  {(s.fetch_url || s.url) && (
                    <div className="text-[9px] text-[#C7C7CC] mt-0.5 truncate">
                      {s.fetch_url || s.url}
                      {s.fetch_frequency_minutes > 0 && ` · 每${Math.round(s.fetch_frequency_minutes / 60)}h`}
                    </div>
                  )}
                </div>
                <div className="flex flex-col" style={{ gap: "2px" }}>
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs cursor-pointer bg-transparent border-0 rounded text-[#07C160]"
                    style={{ padding: "4px 8px" }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-xs cursor-pointer bg-transparent border-0 rounded text-[#FF3B30]"
                    style={{ padding: "4px 8px" }}
                  >
                    移除
                  </button>
                </div>
              </div>
              {editingId === s.id && (
                <div className="bg-[#F9F9FB] rounded-lg p-2" style={{ marginBottom: "8px", border: "0.5px solid #E5E5E5" }}>
                  <input
                    className="w-full border rounded px-2 py-[5px] text-[12px] outline-none mb-[4px]"
                    style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
                    placeholder="RSS/网页地址（https://...）"
                    value={editFetchUrl}
                    onChange={(e) => setEditFetchUrl(e.target.value)}
                  />
                  <div className="flex items-center" style={{ gap: "4px", marginBottom: "4px" }}>
                    <span className="text-[10px] text-[#8A8A8E] shrink-0">抓取间隔</span>
                    <select
                      value={editFreq}
                      onChange={(e) => setEditFreq(Number(e.target.value))}
                      className="text-[11px] border rounded px-1 py-[3px] outline-none"
                      style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
                    >
                      {[120, 360, 480, 720, 1440].map((v) => (
                        <option key={v} value={v}>{v >= 60 ? `每${Math.round(v / 60)}小时` : `${v}分钟`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end" style={{ gap: "4px" }}>
                    <button onClick={() => setEditingId(null)} className="text-[10px] cursor-pointer bg-[#F2F2F7] border-0 rounded px-2 py-1">取消</button>
                    <button onClick={saveEdit} className="text-[10px] cursor-pointer bg-[#07C160] text-white border-0 rounded px-2 py-1">保存</button>
                  </div>
                </div>
              )}
            </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
