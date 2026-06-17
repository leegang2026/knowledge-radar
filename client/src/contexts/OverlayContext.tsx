import { createContext, useContext, useState, ReactNode } from "react";

/** 全局 Overlay 控制 — 取代 (window as any).__show*Overlay 的耦合 */
type OverlayType = "keywords" | "sources" | "aiConfig" | null;

interface OverlayContextValue {
  active: OverlayType;
  open: (which: Exclude<OverlayType, null>) => void;
  close: () => void;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<OverlayType>(null);
  return (
    <OverlayContext.Provider
      value={{
        active,
        open: (which) => setActive(which),
        close: () => setActive(null),
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay 必须在 <OverlayProvider> 内使用");
  return ctx;
}
