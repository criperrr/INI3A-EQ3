import React from "react";

interface IconProps {
    size?: number;
    color?: string;
    style?: any;
}

export const SvgHomeIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

export const SvgCartIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

export const SvgSearchIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const SvgTagIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);

export const SvgTrophyIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
        <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
    </svg>
);

export const SvgCameraIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

export const SvgShieldIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export const SvgMapPinIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

export const SvgCarIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);

export const SvgSparkleIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
);

export const SvgCheckIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const SvgCloseIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const SvgDownloadIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export const SvgGithubIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
);

export const SvgMoonIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

export const SvgSunIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

export const SvgAmoledIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
        <circle cx="12" cy="12" r="10" />
    </svg>
);

export const SvgChevronDownIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export const SvgChevronRightIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

export const SvgGearIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

export const SvgLockIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

export const SvgScaleIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M12 3v18" />
        <path d="M4 7l8-4 8 4" />
        <path d="M6 18l-3-6h6l-3 6z" />
        <path d="M18 18l-3-6h6l-3 6z" />
    </svg>
);

export const SvgBoltIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export const SvgBoxIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);

export const SvgMoneyIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

export const SvgLeafIcon: React.FC<IconProps> = ({ size = 18, color = "currentColor", style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
);

/**
 * Valid, Scannable Official QR Code SVG for https://github.com/criperrr/INI3A-EQ3/releases/latest
 */
export const SvgOfficialReleaseQrCode: React.FC<{ size?: number; color?: string; bgColor?: string }> = ({
    size = 180,
    color = "#000000",
    bgColor = "#FFFFFF",
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 37 37"
        shapeRendering="crispEdges"
        style={{ display: "block", borderRadius: 10 }}
    >
        <rect width="37" height="37" fill={bgColor} />
        <path
            stroke={color}
            strokeWidth="1"
            fill="none"
            d="M2 2.5h7m5 0h1m5 0h4m1 0h1m2 0h7M2 3.5h1m5 0h1m4 0h2m3 0h1m1 0h1m2 0h2m3 0h1m5 0h1M2 4.5h1m1 0h3m1 0h1m1 0h5m1 0h1m1 0h1m1 0h2m2 0h1m3 0h1m1 0h3m1 0h1M2 5.5h1m1 0h3m1 0h1m1 0h1m1 0h3m5 0h1m1 0h3m3 0h1m1 0h3m1 0h1M2 6.5h1m1 0h3m1 0h1m1 0h3m3 0h5m1 0h2m2 0h1m1 0h1m1 0h3m1 0h1M2 7.5h1m5 0h1m1 0h2m2 0h1m5 0h3m2 0h1m2 0h1m5 0h1M2 8.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 9.5h2m3 0h2m1 0h1m3 0h2M2 10.5h1m1 0h5m9 0h2m1 0h2m2 0h1m2 0h5M2 11.5h3m4 0h1m1 0h5m1 0h3m1 0h2m2 0h1m2 0h2m1 0h2m1 0h1M3 12.5h1m2 0h3m2 0h1m1 0h1m1 0h3m1 0h1m2 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1M2 13.5h3m1 0h1m4 0h1m3 0h1m1 0h1m1 0h3m4 0h2m2 0h5M2 14.5h1m1 0h2m2 0h1m1 0h1m1 0h1m3 0h3m6 0h2m1 0h2m1 0h1m1 0h1M3 15.5h1m2 0h1m3 0h3m2 0h1m1 0h1m2 0h1m1 0h1m1 0h1m2 0h1m2 0h1m1 0h3M4 16.5h2m2 0h1m1 0h5m2 0h2m1 0h3m1 0h2m1 0h2m2 0h3M2 17.5h3m2 0h1m1 0h2m1 0h1m2 0h1m1 0h1m2 0h1m1 0h2m3 0h2m1 0h2M4 18.5h1m1 0h1m1 0h1m2 0h2m1 0h1m2 0h1m1 0h1m4 0h1m1 0h2m1 0h2m1 0h1m1 0h1M4 19.5h3m2 0h1m2 0h1m1 0h1m1 0h1m3 0h3m2 0h1m2 0h2m1 0h2M2 20.5h2m2 0h1m1 0h4m5 0h1m2 0h1m1 0h3m1 0h2m1 0h2m1 0h2M3 21.5h1m1 0h1m1 0h1m1 0h3m3 0h1m5 0h2m1 0h1m2 0h1m1 0h4m1 0h1M5 22.5h6m5 0h2m2 0h3m3 0h1m1 0h1m1 0h2M2 23.5h6m1 0h2m1 0h2m1 0h4m4 0h2m1 0h4m4 0h1M2 24.5h1m1 0h2m1 0h2m3 0h1m1 0h1m6 0h2m2 0h1m1 0h1m1 0h1m1 0h3M2 25.5h1m4 0h1m1 0h2m1 0h2m1 0h2m1 0h1m4 0h2m2 0h3m1 0h4M2 26.5h1m3 0h3m1 0h1m1 0h5m1 0h2m4 0h1m1 0h7m1 0h1M10 27.5h1m1 0h5m1 0h2m1 0h1m1 0h1m1 0h2m3 0h1m1 0h1m1 0h1M2 28.5h7m2 0h3m3 0h1m1 0h1m2 0h2m1 0h2m1 0h1m1 0h1m1 0h1m1 0h1M2 29.5h1m5 0h1m1 0h1m3 0h1m1 0h1m2 0h2m1 0h1m1 0h3m3 0h5M2 30.5h1m1 0h3m1 0h1m1 0h1m1 0h3m1 0h3m2 0h3m2 0h6M2 31.5h1m1 0h3m1 0h1m1 0h4m1 0h1m1 0h1m2 0h1m1 0h1m2 0h3m2 0h1m2 0h1M2 32.5h1m1 0h3m1 0h1m1 0h1m2 0h10m1 0h1m3 0h2M2 33.5h1m5 0h1m3 0h6m2 0h1m1 0h5m3 0h2M2 34.5h7m1 0h10m4 0h1m2 0h1m1 0h1m1 0h3"
        />
    </svg>
);
