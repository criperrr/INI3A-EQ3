// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
    theme: 'light' | 'dark';
    isDark: boolean;
    themeStyles: typeof lightTheme;
    setGlobalTheme: (newTheme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const loadTheme = async () => {
            const savedSettings = await AsyncStorage.getItem('app_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.theme) setTheme(parsed.theme);
            }
        };
        loadTheme();
    }, []);

    const setGlobalTheme = async (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
    };

    const isDark = theme === 'dark';
    const themeStyles = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, themeStyles, setGlobalTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
    return context;
};

// Seus temas centralizados aqui (remova dos outros arquivos para não duplicar)
const lightTheme = StyleSheet.create({
    bg: { backgroundColor: '#F9FAFB' },
    headerBg: { backgroundColor: '#FFFFFF', borderBottomColor: '#E5E7EB' },
    card: { backgroundColor: '#FFFFFF' },
    border: { borderColor: '#E5E7EB' },
    text: { color: '#111827' },
    subText: { color: '#6B7280' },
    btnToggleOff: { backgroundColor: '#E5E7EB' },
    inputBg: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
});

const darkTheme = StyleSheet.create({
    bg: { backgroundColor: '#111827' },
    headerBg: { backgroundColor: '#1F2937', borderBottomColor: '#374151' },
    card: { backgroundColor: '#1F2937' },
    border: { borderColor: '#374151' },
    text: { color: '#FFFFFF' },
    subText: { color: '#9CA3AF' },
    btnToggleOff: { backgroundColor: '#374151' },
    inputBg: { backgroundColor: '#111827', borderColor: '#374151' }
});