// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeContextType {
  theme: "light" | "dark";
  isDark: boolean;
  accent: string;
  themeStyles: typeof lightTheme;
  setGlobalTheme: (newTheme: "light" | "dark") => void;
}

const ACCENT_LIGHT = "#2E7D32";
const ACCENT_DARK = "#F5B731";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const loadTheme = async () => {
      const savedSettings = await AsyncStorage.getItem("app_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.theme) setTheme(parsed.theme);
      }
    };
    loadTheme();
  }, []);

  const setGlobalTheme = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    try {
      const savedSettings = await AsyncStorage.getItem("app_settings");
      const parsed = savedSettings ? JSON.parse(savedSettings) : {};
      parsed.theme = newTheme;
      await AsyncStorage.setItem("app_settings", JSON.stringify(parsed));
    } catch (error) {
      console.error("Erro ao persistir tema:", error);
    }
  };

  const isDark = theme === "dark";
  const themeStyles = isDark ? darkTheme : lightTheme;
  const accent = isDark ? ACCENT_DARK : ACCENT_LIGHT;

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, accent, themeStyles, setGlobalTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  return context;
};

// Tema claro — off-white esverdeado, detalhes em verde
const lightTheme = StyleSheet.create({
  bg: { backgroundColor: "#F5F7F2" },
  headerBg: { backgroundColor: "#EEF2E8", borderBottomColor: "#D4DCC8" },
  card: { backgroundColor: "#F0F4EC" },
  border: { borderColor: "#D4DCC8" },
  text: { color: "#1A2E1A" },
  subText: { color: "#5A6B52" },
  btnToggleOff: { backgroundColor: "#D4DCC8" },
  inputBg: { backgroundColor: "#E8EDE2", borderColor: "#D4DCC8" },
});

// Tema escuro — mais saturado, detalhes em amarelo
const darkTheme = StyleSheet.create({
  bg: { backgroundColor: "#0D1117" },
  headerBg: { backgroundColor: "#161B22", borderBottomColor: "#30363D" },
  card: { backgroundColor: "#1C2333" },
  border: { borderColor: "#30363D" },
  text: { color: "#F0E6D3" },
  subText: { color: "#8B949E" },
  btnToggleOff: { backgroundColor: "#30363D" },
  inputBg: { backgroundColor: "#0D1117", borderColor: "#30363D" },
});
