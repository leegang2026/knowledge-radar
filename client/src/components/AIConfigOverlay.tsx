import { useState, useEffect } from "react";

const STORAGE_KEY = "knowledge_radar_ai_config";

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // 忽略 localStorage 读取错误，使用默认配置
  }
  return { baseUrl: "https://api.deepseek.com/v1", apiKey: "", model: "deepseek-chat" };
}

function saveConfig(c: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

const PRESET_MODELS = [
  { label: "DeepSeek", value: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
  { label: "OpenAI", value: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
  { label: "Gemini", value: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { label: "通义千问", value: "qwen-max", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { label: "Moonshot", value: "moonshot-v1-8k", baseUrl: "https://api.moonshot.cn/v1" },
  { label: "自定义", value: "", baseUrl: "" },
];

export default function AIConfigOverlay({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [selectedPreset, setSelectedPreset] = useState(() => {
    const match = PRESET_MODELS.find(
      (p) => p.baseUrl === config.baseUrl && (p.value === config.model || p.value === "")
    );
    return match?.label || "自定义";
  });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok?: boolean; message?: string } | null>(null);

  // 从服务端同步配置（优先级高于 localStorage）
  useEffect(() => {
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.base_url && data.model) {
          const serverCfg = {
            baseUrl: data.base_url,
            apiKey: "", // 不暴露 key，保持本地值
            model: data.model,
          };
          setConfig((prev) => ({
            baseUrl: serverCfg.baseUrl || prev.baseUrl,
            apiKey: prev.apiKey, // 保留本地 key
            model: serverCfg.model || prev.model,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handlePreset = (preset: (typeof PRESET_MODELS)[number]) => {
    setSelectedPreset(preset.label);
    if (preset.value) {
      setConfig((prev) => ({
        ...prev,
        model: preset.value,
        baseUrl: preset.baseUrl || prev.baseUrl,
      }));
    }
  };

  const handleSave = async () => {
    saveConfig(config);
    // 同步到服务端
    try {
      await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: config.baseUrl,
          api_key: config.apiKey,
          model: config.model,
        }),
      });
      alert("AI 配置已保存，下次抓取生效");
    } catch {
      alert("AI 配置已保存到本地，但服务端同步失败（后端未启动？）\n抓取时将使用本地缓存配置");
    }
    onClose();
  };

  return (
    <div
      className="absolute inset-0 bg-white z-30 overflow-y-auto rounded-[24px]"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* 头部 */}
      <div className="flex items-center" style={{ padding: "6px 14px", gap: "10px", borderBottom: "0.5px solid #F2F2F7" }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer text-[#07C160] bg-transparent border-0"
          style={{ width: "28px", height: "28px", fontSize: "18px" }}
        >
          ←
        </button>
        <span className="text-[15px] font-medium">大模型自定义配置</span>
      </div>

      <div className="text-[11px] text-[#8A8A8E]" style={{ padding: "8px 14px 4px" }}>
        配置 AI 模型用于相关度评分和摘要生成，支持 OpenAI 兼容接口
      </div>

      <div style={{ padding: "10px 14px" }}>
        {/* 预设模型 */}
        <div className="mb-4">
          <div className="text-[11px] text-[#8A8A8E] mb-[6px]">预设模型</div>
          <div className="flex flex-wrap" style={{ gap: "5px" }}>
            {PRESET_MODELS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={`shrink-0 rounded-[10px] border transition-all duration-150 whitespace-nowrap ${
                  selectedPreset === p.label
                    ? "bg-[#F2F2F7] border-[#07C160] text-[#07C160] font-medium"
                    : "bg-transparent border-[#E5E5E5] text-[#8A8A8E]"
                }`}
                style={{ padding: "5px 12px", fontSize: "11px", borderWidth: "0.5px" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API 地址 */}
        <div className="mb-3">
          <div className="text-[11px] text-[#8A8A8E] mb-[4px]">API Base URL</div>
          <input
            className="w-full border rounded px-2 py-[7px] text-[13px] outline-none"
            style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
            placeholder="https://api.deepseek.com/v1"
            value={config.baseUrl}
            onChange={(e) => { setConfig((prev) => ({ ...prev, baseUrl: e.target.value })); setSelectedPreset("自定义"); }}
          />
        </div>

        {/* API Key */}
        <div className="mb-3">
          <div className="text-[11px] text-[#8A8A8E] mb-[4px]">API Key</div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded px-2 py-[7px] text-[13px] outline-none"
              style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-[11px] text-[#8A8A8E] cursor-pointer bg-transparent border-0 shrink-0"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </div>

        {/* 模型名称 */}
        <div className="mb-4">
          <div className="text-[11px] text-[#8A8A8E] mb-[4px]">Model</div>
          <input
            className="w-full border rounded px-2 py-[7px] text-[13px] outline-none"
            style={{ borderColor: "#E5E5E5", borderWidth: "0.5px" }}
            placeholder="deepseek-chat"
            value={config.model}
            onChange={(e) => { setConfig((prev) => ({ ...prev, model: e.target.value })); setSelectedPreset("自定义"); }}
          />
          <div className="text-[10px] text-[#C7C7CC] mt-1">模型名称需与 API 提供商支持的值一致</div>
        </div>

        {/* 测试连接 */}
        <div className="mb-3">
          <div className="flex items-center" style={{ gap: "8px" }}>
            <button
              onClick={async () => {
                setTesting(true);
                setTestResult(null);
                try {
                  const resp = await fetch("/api/ai/test", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      base_url: config.baseUrl,
                      api_key: config.apiKey,
                      model: config.model,
                    }),
                  });
                  const text = await resp.text();
                  try {
                    const data = JSON.parse(text);
                    setTestResult({
                      ok: data.ok,
                      message: data.message || (data.ok ? "连接成功" : "请求失败"),
                    });
                  } catch {
                    setTestResult({
                      ok: false,
                      message: `服务器返回非 JSON (${resp.status}): ${text.slice(0, 50)}`,
                    });
                  }
                } catch (e: unknown) {
                  setTestResult({
                    ok: false,
                    message: e instanceof Error && e.message === "Failed to fetch"
                      ? "后端服务未启动，请在 server 目录运行 python main.py"
                      : (e instanceof Error ? e.message : "未知错误"),
                  });
                } finally {
                  setTesting(false);
                }
              }}
              disabled={testing}
              className="border rounded-md cursor-pointer text-[12px] disabled:opacity-50"
              style={{
                padding: "6px 14px",
                borderColor: "#07C160",
                borderWidth: "0.5px",
                color: "#07C160",
                background: "transparent",
              }}
            >
              {testing ? "测试中..." : "测试连接"}
            </button>
            {testResult && (
              <span className={`text-[12px] ${testResult.ok ? "text-[#07C160]" : "text-[#FF3B30]"}`}>
                {testResult.ok ? "✓ " + testResult.message : "✗ " + testResult.message}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#C7C7CC] mt-1">
            发送简单对话请求验证 API 地址、Key 和模型是否可用
          </div>
        </div>

        {/* 保存 */}
        <div className="flex justify-end" style={{ gap: "8px" }}>
          <button
            onClick={onClose}
            className="bg-[#F2F2F7] border-0 rounded-md cursor-pointer"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="bg-[#07C160] text-white border-0 rounded-md cursor-pointer"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
