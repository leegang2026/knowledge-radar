import { useOverlay } from "../contexts/OverlayContext";

export default function Profile() {
  const { open } = useOverlay();
  return (
    <div>
      {/* 用户头像区 — 参考设计 */}
      <div style={{ textAlign: "center", padding: "30px 0 20px" }}>
        <div
          className="bg-[#07C160] text-white flex items-center justify-center font-medium rounded-full"
          style={{ width: "56px", height: "56px", fontSize: "24px", margin: "0 auto 10px auto" }}
        >
          I
        </div>
        <div style={{ fontSize: "15px", fontWeight: 500 }}>Intellivis</div>
        <div className="text-[11px] text-[#8A8A8E]" style={{ marginTop: "2px" }}>知识雷达用户</div>
      </div>

      {/* 功能入口 */}
      <div style={{ padding: "0 16px" }}>
        <div
          className="flex items-center justify-between text-[13px] cursor-pointer"
          style={{ padding: "12px 0", borderBottom: "0.5px solid #F2F2F7" }}
          onClick={() => open("sources")}
        >
          <span>公众号池管理</span>
          <span className="text-[#C7C7CC]">›</span>
        </div>
        <div
          className="flex items-center justify-between text-[13px] cursor-pointer"
          style={{ padding: "12px 0", borderBottom: "0.5px solid #F2F2F7" }}
          onClick={() => open("keywords")}
        >
          <span>关键词设置</span>
          <span className="text-[#C7C7CC]">›</span>
        </div>
        <div
          className="flex items-center justify-between text-[13px] cursor-pointer"
          style={{ padding: "12px 0", borderBottom: "0.5px solid #F2F2F7" }}
          onClick={() => open("aiConfig")}
        >
          <span>大模型自定义配置</span>
          <span className="text-[#C7C7CC]">›</span>
        </div>
        <div
          className="text-[13px] text-[#8A8A8E] cursor-pointer"
          style={{ padding: "12px 0" }}
          onClick={() =>
            alert(
              "知识雷达 V1.0 · 个人知识平台信息收集层\n按关键词追踪公众号内容\nAI 摘要 · 已读管理 · 全局搜索"
            )
          }
        >
          关于知识雷达 · V1.0
        </div>
      </div>
    </div>
  );
}
