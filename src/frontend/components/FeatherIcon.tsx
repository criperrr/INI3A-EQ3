import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

const THEME_COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
    white: "#FFFFFF",
    black: "#000000",
};

// Cor base por tipo de mercado — ajuste/adicione tipos livremente
const MARKET_TYPE_COLORS: Record<string, { light: string; dark: string }> = {
    supermarket: { light: THEME_COLORS.darkBlue, dark: THEME_COLORS.accent },
    convenience: { light: "#D84315", dark: "#FF8A65" },
    grocery:     { light: "#2E7D32", dark: "#81C784" },
    default:     { light: THEME_COLORS.darkBlue, dark: THEME_COLORS.accent },
};

export const getFeatherColors = (
    shopType: string | undefined,
    isDark: boolean,
    selected?: boolean
) => {
    const key = shopType && MARKET_TYPE_COLORS[shopType] ? shopType : "default";
    const base = MARKET_TYPE_COLORS[key][isDark ? "dark" : "light"];

    return {
        primary: selected ? THEME_COLORS.accent : base,
        secondary: isDark ? THEME_COLORS.black : THEME_COLORS.white,
        tip: isDark ? THEME_COLORS.white : THEME_COLORS.black,
    };
};

interface SvgFeatherProps {
    primaryColor: string;
    secondaryColor: string;
    tipColor: string;
    size: number;
}

const SvgFeather: React.FC<SvgFeatherProps> = ({ primaryColor, secondaryColor, tipColor, size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <G fill="none" fillRule="evenodd">
            <Path
                d="M20.8 2.3c-1-1-2.7-1-3.7 0l-12 12c-.5.5-.8 1.2-.8 1.9s.3 1.4.8 1.9l2.1 2.1 2.1 2.1c.5.5 1.2.8 1.9.8s1.4-.3 1.9-.8l12-12c1-1 1-2.7 0-3.7l-2.3-2.3z"
                fill={primaryColor}
            />
            <Path
                d="M4.3 16.3l2.1 2.1L18.4 6.4c.5-.5.8-1.2.8-1.9s-.3-1.4-.8-1.9l-1.1-1.1-1.1-1.1c-.5-.5-1.2-.8-1.9-.8s-1.4.3-1.9.8L2.3 14.2l2.1 2.1z"
                fill={secondaryColor}
            />
            <Path d="M3 21h18v2H3z" fill={tipColor} />
        </G>
    </Svg>
);

interface FeatherIconProps {
    size?: number;
    isDark: boolean;
    shopType?: string;
    selected?: boolean;
    materialColors?: {
        primaryContainer: string;
        secondaryContainer: string;
        primary: string;
    };
}

export const FeatherIcon: React.FC<FeatherIconProps> = ({
                                                            size = 40,
                                                            isDark,
                                                            shopType,
                                                            selected,
                                                            materialColors,
                                                        }) => {
    const colors = materialColors
        ? {
            primary: materialColors.primaryContainer,
            secondary: materialColors.secondaryContainer,
            tip: materialColors.primary,
        }
        : getFeatherColors(shopType, isDark, selected);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <SvgFeather
                primaryColor={colors.primary}
                secondaryColor={colors.secondary}
                tipColor={colors.tip}
                size={size}
            />
        </View>
    );
};

export default FeatherIcon;