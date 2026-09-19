import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

const THEME_COLORS = {
    darkBlue: "#1565C0",
    accent: "#F5B731",
    white: "#FFFFFF",
    black: "#000000",
};

// Cor base por tipo de mercado
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
    size: number;
}

const SvgFeather: React.FC<SvgFeatherProps> = ({ primaryColor, secondaryColor, size }) => (
    <Svg width={size} height={size} viewBox="0 0 3400 3400">
        <G transform="translate(1700, 3150) scale(1.35, 1.05) rotate(-30) translate(-16, -1360)">
            <Path
                d="M1616.4 0.733682C1521.6 10.467 1355.87 71.1337 1210.4 149.534C997.2 264.334 824.4 415.4 724.4 574.467C717.467 585.534 711.067 595.667 710.267 596.867C709.2 598.2 709.333 595.667 710.667 589.134C713.867 572.734 711.733 562.734 703.867 557.4C695.067 551.4 684.667 555.134 670.933 569.4C654.8 586.2 640.4 608.734 616.4 654.467C591.2 702.6 573.467 735.534 571.733 738.067C570.8 739.4 571.733 733.267 573.867 723.667C576 714.6 578.667 701.267 579.867 694.2C581.733 682.334 581.733 680.6 579.733 673.8C577.867 667.134 577.067 666.067 572 663.667C563.067 659.267 557.467 661.4 546.133 673.8C530.133 691.134 512.267 721.134 474.4 793.8C460.133 821.134 447.333 845.534 445.733 848.067L443.067 852.467L443.867 842.467C446.133 815 435.067 801.267 418.4 811C405.867 818.467 390.133 845.8 361.733 910.467C356.4 922.6 348.267 940.867 343.733 951.267C339.2 961.667 330.667 978.067 324.933 987.934C303.467 1024.6 297.867 1035 294.133 1044.73L290.4 1054.6L241.733 1100.07C149.867 1185.93 65.3333 1269 8.53333 1329.4L0 1338.47L7.73333 1348.73C12 1354.47 15.6 1359.27 15.7333 1359.4C16.1333 1360.07 45.6 1343.93 56.8 1336.87C108 1304.87 175.467 1254.2 273.6 1173.93C306.8 1146.87 313.333 1141.93 316.533 1142.2C326.533 1143.27 346.533 1138.47 375.867 1127.93C384 1125 398.933 1120.47 409.2 1117.8C447.733 1107.8 453.333 1106.2 463.733 1102.87C487.2 1095.27 496.4 1087.4 496.4 1074.73C496.4 1070.87 495.467 1068.73 492.667 1066.07C490.667 1064.07 488.267 1062.47 487.333 1062.47C481.867 1062.47 489.6 1059 519.467 1047.93C571.067 1028.6 594.533 1019 608.4 1011.4C631.867 998.467 641.733 985 635.467 974.334C631.2 967 624.533 964.6 607.867 964.734C595.467 964.734 593.6 964.467 595.6 963C604.667 956.467 675.067 922.6 783.067 872.734C862.533 836.067 875.467 829.934 895.733 818.6C923.6 803 933.733 793.667 933.733 783.534C933.733 772.2 926.933 767.267 911.733 767.534C903.733 767.667 876.133 772.6 861.733 776.467C857.733 777.534 854.267 778.2 854.133 777.934C853.867 777.667 861.067 773.4 870 768.334C977.6 708.6 1131.6 616.867 1173.07 587.934C1187.07 578.2 1213.73 555.934 1267.73 509.134C1292 488.2 1329.73 455.8 1351.73 437.134C1539.33 278.467 1647.2 169.8 1685.47 101.267C1701.33 73.0004 1706 52.867 1700.93 35.8004C1695.47 17.5337 1681.73 6.86702 1657.47 1.93368C1648.13 -0.0663185 1628.8 -0.599652 1616.4 0.733682Z"
                fill={primaryColor}
                stroke={secondaryColor}
                strokeWidth="150" /* Aumentado para manter o formato bem definido com o novo tamanho */
                strokeLinejoin="round"
            />
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
                                                            size = 160, // Aumentado significativamente para sobressair no mapa
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
                size={size}
            />
        </View>
    );
};

export default FeatherIcon;