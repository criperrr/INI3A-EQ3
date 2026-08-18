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
  navigateToTab: (targetRoute: string, forcedDirection?: "left" | "right") => void;
  getTabIndex: (path: string | null | undefined) => number;
}

const TabNavigationContext = createContext<TabNavigationContextData>(
  {} as TabNavigationContextData
);

export function TabNavigationProvider({ children }: { children: ReactNode }) {
  const [animationType, setAnimationType] = useState<StackAnimationType>("slide_from_right");
  const router = useRouter();
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  currentPathRef.current = pathname;

  const navigateToTab = useCallback(
    (targetRoute: string, forcedDirection?: "left" | "right") => {
      const currentPath = currentPathRef.current;
      if (currentPath === targetRoute) return;

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
      }

      setAnimationType(nextAnimation);

      try {
        if (router.canDismiss && router.canDismiss()) {
          router.dismissAll();
        }
      } catch {}

      router.replace(targetRoute as any);
    },
    [router]
  );

  const contextValue = React.useMemo<TabNavigationContextData>(
    () => ({ animationType, navigateToTab, getTabIndex }),
    [animationType, navigateToTab],
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
