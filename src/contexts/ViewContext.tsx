"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useDeepLink } from "@/hooks/useDeepLink";
import type { ViewMode } from "@/types";

interface ViewContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewContext = createContext<ViewContextType | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { state, setView } = useDeepLink();

  return (
    <ViewContext.Provider value={{ viewMode: state.view, setViewMode: setView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}
