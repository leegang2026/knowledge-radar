import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import KeywordManageOverlay from "./KeywordManageOverlay";
import SourcePoolOverlay from "./SourcePoolOverlay";
import AIConfigOverlay from "./AIConfigOverlay";

const NAV_ITEMS = [
  { to: "/", label: "雷达", icon: "📡" },
  { to: "/search", label: "搜索", icon: "🔍" },
  { to: "/stats", label: "统计", icon: "📊" },
  { to: "/profile", label: "我的", icon: "👤" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [showKeywords, setShowKeywords] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);

  // Expose overlay controls globally for cross-page access
  useEffect(() => {
    (window as any).__showKeywordOverlay = () => setShowKeywords(true);
    (window as any).__showSourceOverlay = () => setShowSources(true);
    (window as any).__showAIConfigOverlay = () => setShowAIConfig(true);
    return () => {
      delete (window as any).__showKeywordOverlay;
      delete (window as any).__showSourceOverlay;
      delete (window as any).__showAIConfigOverlay;
    };
  }, []);

  const tabIndex = NAV_ITEMS.findIndex((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  return (
    <>
      {/* 状态栏 — 匹配参考设计；手机端适配刘海屏 */}
      <div className="flex justify-between text-[11px] font-medium text-[#8A8A8E]"
        style={{
          padding: "12px 18px 4px",
          paddingTop: "max(12px, env(safe-area-inset-top))",
        }}>
        <span>9:41</span>
        <span>📶 100%</span>
      </div>

      {/* 主内容区 — flex-1 撑满空间，内容超出时滚动 */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* 底部导航 — 匹配参考设计；手机端适配底部指示条 */}
      <nav className="border-t border-[#E5E5E5] bg-white flex shrink-0"
        style={{
          borderTopWidth: "0.5px",
          padding: "3px 0 8px",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}>
        {NAV_ITEMS.map((item, i) => {
          const isActive = i === tabIndex;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={`flex-1 flex flex-col items-center text-[10px] py-1 cursor-pointer no-underline ${
                isActive ? "text-[#07C160]" : "text-[#8A8A8E]"
              }`}
            >
              <span className="text-[20px] leading-[1.2] mb-px">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* 全局 Overlay — 覆盖整个卡片 */}
      {showKeywords && (
        <KeywordManageOverlay onClose={() => setShowKeywords(false)} />
      )}
      {showSources && (
        <SourcePoolOverlay onClose={() => setShowSources(false)} />
      )}
      {showAIConfig && (
        <AIConfigOverlay onClose={() => setShowAIConfig(false)} />
      )}
    </>
  );
}
