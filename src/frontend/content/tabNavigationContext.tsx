import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "expo-router";

export type StackAnimationType = "slide_from_right" | "slide_from_left" | "default";

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
  if (path.includes("/search")) return 1;
  if (path.includes("/scannerProduct")) return 2;
  if (path.includes("/map")) return 3;
  if (path.includes("/profile")) return 4;
  return -1;
};

interface TabNavigationContextData {
  animationType: StackAnimationType;
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
  const [animationType, setAnimationType] = useState<StackAnimationType>("slide_from_right");
  const [resetHomeTrigger, setResetHomeTrigger] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  currentPathRef.current = pathname;

  const triggerHomeReset = useCallback(() => {
    setResetHomeTrigger((prev) => prev + 1);
  }, []);

  const navigateToTab = useCallback(
    (
      targetRoute: string,
      forcedDirection?: "left" | "right",
      forceReset?: boolean
    ) => {
      const currentPath = currentPathRef.current;

      if (targetRoute === "/" || targetRoute === "") {
        triggerHomeReset();
      }

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

      const currentIndex = getTabIndex(currentPath);
      const targetIndex = getTabIndex(targetRoute);

      let nextAnimation: StackAnimationType = "slide_from_right";

      if (forcedDirection === "left") {
        nextAnimation = "slide_from_left";
      } else if (forcedDirection === "right") {
        nextAnimation = "slide_from_right";
      } else if (currentIndex !== -1 && targetIndex !== -1) {
        if (targetIndex < currentIndex) {
          nextAnimation = "slide_from_left";
        } else {
          nextAnimation = "slide_from_right";
        }
      } else if (targetRoute === "/") {
        nextAnimation = "slide_from_left";
      }

      setAnimationType(nextAnimation);

      try {
        if (router.canDismiss && router.canDismiss()) {
          router.dismissAll();
        }
      } catch {}

      router.replace(targetRoute as any);
    },
    [router, triggerHomeReset]
  );

  const contextValue = React.useMemo<TabNavigationContextData>(
    () => ({
      animationType,
      navigateToTab,
      getTabIndex,
      resetHomeTrigger,
      triggerHomeReset,
    }),
    [animationType, navigateToTab, resetHomeTrigger, triggerHomeReset]
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
