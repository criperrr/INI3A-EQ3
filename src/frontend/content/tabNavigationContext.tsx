import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "expo-router";

export interface TabItem {
  key: string;
  route: string;
}

export const MAIN_TABS: readonly TabItem[] = [
  { key: "home", route: "/" },
  { key: "search", route: "/search" },
  { key: "registerProduct", route: "/scannerProduct" },
  { key: "map", route: "/map" },
  { key: "profile", route: "/profile" },
] as const;

export const getTabIndex = (path: string | null | undefined): number => {
  if (!path || path === "/") return 0;
  if (path === "/search") return 1;
  if (path === "/scannerProduct") return 2;
  if (path === "/map") return 3;
  if (path === "/profile") return 4;
  return -1;
};

interface TabNavigationContextData {
  navigateToTab: (
    targetRoute: string,
    forcedDirection?: "left" | "right",
    forceReset?: boolean
  ) => void;
  getTabIndex: (path: string | null | undefined) => number;
  resetHomeTrigger: number;
  triggerHomeReset: () => void;
}

const TabNavigationContext = createContext<TabNavigationContextData>(
  {} as TabNavigationContextData
);

export function TabNavigationProvider({ children }: { children: ReactNode }) {
  const [resetHomeTrigger, setResetHomeTrigger] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  const triggerHomeReset = useCallback(() => {
    setResetHomeTrigger((prev) => prev + 1);
  }, []);

  const navigateToTab = useCallback(
    (
      targetRoute: string,
      _forcedDirection?: "left" | "right",
      forceReset?: boolean
    ) => {
      const currentPath = currentPathRef.current;

      if (currentPath === targetRoute) {
        if (targetRoute === "/" && forceReset) {
          try {
            if (router.canDismiss && router.canDismiss()) {
              router.dismissAll();
            }
          } catch {}
          triggerHomeReset();
        }
        return;
      }

      if (targetRoute === "/" || targetRoute === "") {
        triggerHomeReset();
      }

      const currentIndex = getTabIndex(currentPath);
      const isMainTab = currentIndex !== -1;

      if (!isMainTab) {
        try {
          if (router.canDismiss && router.canDismiss()) {
            router.dismissAll();
          }
        } catch {}
        requestAnimationFrame(() => {
          router.replace(targetRoute as any);
        });
        return;
      }

      router.replace(targetRoute as any);
    },
    [router, triggerHomeReset]
  );

  const contextValue = React.useMemo<TabNavigationContextData>(
    () => ({
      navigateToTab,
      getTabIndex,
      resetHomeTrigger,
      triggerHomeReset,
    }),
    [navigateToTab, resetHomeTrigger, triggerHomeReset]
  );

  return (
    <TabNavigationContext.Provider value={contextValue}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error(
      "useTabNavigation must be used within a TabNavigationProvider"
    );
  }
  return context;
}
