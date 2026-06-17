import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { Keyword, Source } from "../types";

const KEYWORD_DOTS = ["#07C160", "#FF9500", "#007AFF", "#5856D6", "#FF3B30", "#1D9E75", "#D4537E"];

const FREQ_OPTIONS = [
  { value: 120, label: "每 2 小时" },
  { value: 360, label: "每 6 小时" },
  { value: 480, label: "每 8 小时" },
  { value: 720, label: "每 12 小时" },
  { value: 1440, label: "每天" },
];

export default function KeywordManageOverlay({ onClose }: { onClose: () => void }) {
  const api = useApi();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);

  // 新建表单
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newThreshold, setNewThreshold] = useState(70);
  const [newSourceIds, setNewSourceIds] = useState<number[]>([]);
  const [newFreq, setNewFreq] = useState(480);
  // 快速添加信息源
  const [quickSourceName, setQuickSourceName] = useState("");
  const [quickSourceUrl, setQuickSourceUrl] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Keyword[]>("/api/keywords"),
      api.get<Source[]>("/api/sources"),
    ]).then(([kws, srcs]) => {
      setKeywords(kws);
      setSources(srcs);
      const t: Record<string, number> = {};
      kws.forEach((kw) => { t[kw.name] = kw.relevance_threshold; });
      setThresholds(t);
    });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确认移除此关键词？")) return;
    try {
      await api.delete(`/api/keywords/${id}`);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleQuickAddSource = async () => {
    const name = quickSourceName.trim();
    if (!name) return;
    try {
      await api.post("/api/sources", {
        name,
        fetch_url: quickSourceUrl.trim() || undefined,
        fetch_frequency_minutes: newFreq,
      });
      const updated = await api.get<Source[]>("/api/sources");
      setSources(updated);
      // 自动选中新添加的 source
      const newSrc = updated.find((s) => s.name === name);
      if (newSrc) setNewSourceIds((prev) => [...prev, newSrc.id]);
      setQuickSourceName("");
      setQuickSourceUrl("");
    } catch (e) { console.error(e); }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const desc = newDesc.trim().slice(0, 100);
    try {
      await api.post("/api/keywords", {
        name,
        description: desc || undefined,
        relevance_threshold: newThreshold,
        source_ids: newSourceIds,
        fetch_frequency_minutes: newFreq,
      });
      setNewName(""); setNewDesc(""); setNewThreshold(70); setNewSourceIds([]); setNewFreq(480);
      setShowAdd(false);
      const kws = await api.get<Keyword[]>("/api/keywords");
      setKeywords(kws);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="absolute inset-0 bg-white z-30 overflow-y-auto rounded-[24px]" style={{ animation: "fadeIn 0.2s ease" }}>
      {/* 头部 */}
      <div className="flex items-center" style={{ padding: "6px 14px", gap: "10px", borderBottom: "0.5px solid #F2F2F7" }}>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer text-[#07C160] bg-transparent border-0" style={{ width: "28px", height: "28px", fontSize: "18px" }}>←</button>
        <span className="text-[15px] font-medium">关键词 & 信息源设置</span>
      </div>

      <div className="text-[11px] text-[#8A8A8E]" style={{ padding: "8px 14px 4px" }}>
        设置关键词后选择追踪的信息源和抓取频率，AI 将按描述精准筛选入库
      </div>

      {/* 关键词列表 */}
      <div style={{ padding: "6px 14px" }}>
        {keywords.map((kw, i) => (
          <div key={kw.id} className="py-3" style={{ borderBottom: "0.5px solid #F2F2F7" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
              <div className="flex items-center" style={{ gap: "8px" }}>
                <span className="rounded-full shrink-0" style={{ width: "8px", height: "8px", background: KEYWORD_DOTS[i % KEYWORD_DOTS.length] }} />
                <div>
                  <div className="text-[13px] font-medium">{kw.name}</div>
                  {kw.description && <div className="text-[10px] text-[#8A8A8E] mt-0.5">{kw.description}</div>}
                  <div className="text-[10px] text-[#8A8A8E]">
                    命中 {kw.hit_count_30d} 篇 · 追踪 {kw.tracking_count} 个公众号
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(kw.id)} className="text-xs text-[#FF3B30] cursor-pointer bg-transparent border-0" style={{ padding: "4px 8px" }}>移除</button>
            </div>
            <div className="flex items-center" style={{ gap: "8px" }}>
              <span className="text-[10px] text-[#8A8A8E]">阈值</span>
              <input type="range" min={0} max={100} value={thresholds[kw.name] ?? kw.relevance_threshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setThresholds((prev) => ({ ...prev, [kw.name]: val }));
                  api.put(`/api/keywords/${kw.id}`, { ...kw, relevance_threshold: val }).catch(console.error);
                }}
                className="flex-1 h-[4px] rounded-[2px] bg-[#E5E5E5] outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#07C160] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-[11px] font-medium text-[#07C160] text-right" style={{ minWidth: "36px" }}>{thresholds[kw.name] ?? kw.relevance_threshold}%</span>
            </div>
          </div>
        ))}

        {/* 新建表单：关键词 + 信息源 + 抓取频率 统一设置 */}
        {showAdd && (
          <div style={{ padding: "12px 0", borderBottom: "0.5px solid #F2F2F7" }}>
            <div className="text-xs font-medium text-[#555] mb-2">新建关键词</div>

            {/* 关键词名称 */}
            <input className="w-full border rounded px-2 py-[6px] text-[13px] outline-none mb-2" style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
              placeholder="关键词名称（如：人工智能）" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={30} />

            {/* 关键词描述 */}
            <textarea className="w-full border rounded px-2 py-[6px] text-[13px] outline-none resize-none mb-1" style={{ borderColor: "#E5E5E5", borderWidth: "0.5px", height: "48px" }}
              placeholder="描述，≤100字（如：大模型、GPT、Claude 等 AI 相关话题）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={100} />
            <div className="text-[10px] text-[#C7C7CC] text-right mb-2">{newDesc.length}/100</div>

            {/* 相关度阈值 */}
            <div className="flex items-center mb-3" style={{ gap: "8px" }}>
              <span className="text-[11px] text-[#8A8A8E] shrink-0">相关度阈值</span>
              <input type="range" min={0} max={100} value={newThreshold} onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="flex-1 h-[4px] rounded-[2px] bg-[#E5E5E5] outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#07C160] [&::-webkit-slider-thumb]:cursor-pointer" />
              <span className="text-[11px] font-medium text-[#07C160] min-w-[36px] text-right">{newThreshold}%</span>
            </div>

            {/* 抓取频率 */}
            <div className="mb-3">
              <div className="text-[11px] text-[#8A8A8E] mb-[6px]">抓取频率</div>
              <div className="flex flex-wrap" style={{ gap: "5px" }}>
                {FREQ_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setNewFreq(o.value)}
                    className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
                      newFreq === o.value ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium" : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
                    }`}
                    style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* 选择追踪的信息源 */}
            <div className="mb-2">
              <div className="text-[11px] text-[#8A8A8E] mb-[6px]">追踪信息源</div>
              {sources.length === 0 ? (
                <div className="text-[11px] text-[#C7C7CC] mb-2">暂无信息源，请先添加</div>
              ) : (
                <div className="flex flex-wrap" style={{ gap: "5px" }}>
                  {sources.map((s) => (
                    <button key={s.id} onClick={() => setNewSourceIds((prev) => prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                      className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
                        newSourceIds.includes(s.id) ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium" : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
                      }`}
                      style={{ padding: "3px 9px", fontSize: "10px", borderWidth: "0.5px" }}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 快速添加新信息源 */}
            <div className="bg-[#F9F9FB] rounded-lg p-2 mb-2" style={{ border: "0.5px dashed #D1D1D6" }}>
              <div className="text-[10px] text-[#8A8A8E] mb-[6px]">快速添加信息源（RSS 或网页地址）</div>
              <input className="w-full border rounded px-2 py-[5px] text-[12px] outline-none mb-[4px]" style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
                placeholder="信息源名称（如：机器之心）" value={quickSourceName} onChange={(e) => setQuickSourceName(e.target.value)} />
              <div className="flex gap-[4px]">
                <input className="flex-1 border rounded px-2 py-[5px] text-[12px] outline-none" style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
                  placeholder="RSS/网页地址（https://...）" value={quickSourceUrl} onChange={(e) => setQuickSourceUrl(e.target.value)} />
                <button onClick={handleQuickAddSource}
                  className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer whitespace-nowrap" style={{ padding: "4px 10px", fontSize: "11px" }}>添加</button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end" style={{ gap: "8px" }}>
              <button onClick={() => { setShowAdd(false); setNewName(""); setNewDesc(""); setNewSourceIds([]); }}
                className="bg-[#F2F2F7] border-0 rounded-md cursor-pointer" style={{ padding: "6px 14px", fontSize: "12px" }}>取消</button>
              <button onClick={handleAdd}
                className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer" style={{ padding: "6px 14px", fontSize: "12px" }}>确认创建</button>
            </div>
          </div>
        )}

        <button onClick={() => setShowAdd(true)}
          className="w-full text-center text-[13px] text-[#07C160] cursor-pointer bg-transparent rounded-lg"
          style={{ padding: "10px", margin: "8px 0", border: "0.5px dashed #D1D1D6" }}>+ 添加新关键词</button>
      </div>
    </div>
  );
}
