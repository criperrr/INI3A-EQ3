/**
 * Presco Landing Page - Procedural Monstera Deliciosa (Costela-de-Adão) Leaf
 * 100% Canvas 2D Vector Rendering matching user's reference illustration.
 */

export interface MonsteraLeafConfig {
    x: number;
    y: number;
    scale: number;
    rotation: number; // in radians
    swaySpeed?: number;
    swayAmount?: number; // radians
    swayPhase?: number;
    opacity?: number;
    flipped?: boolean;
    depth?: number; // 0 = far/subtle, 1 = foreground/crisp
    variant?: "large" | "medium" | "young";
}

export class AnimatedMonsteraLeaf {
    x: number;
    y: number;
    baseScale: number;
    baseRotation: number;
    swaySpeed: number;
    swayAmount: number;
    swayPhase: number;
    opacity: number;
    flipped: boolean;
    depth: number;
    currentRotation: number;
    targetXOffset: number = 0;
    targetYOffset: number = 0;
    currentXOffset: number = 0;
    currentYOffset: number = 0;

    constructor(config: MonsteraLeafConfig) {
        this.x = config.x;
        this.y = config.y;
        this.baseScale = config.scale;
        this.baseRotation = config.rotation;
        this.swaySpeed = config.swaySpeed ?? 0.8 + Math.random() * 0.4;
        this.swayAmount = config.swayAmount ?? 0.05 + Math.random() * 0.03;
        this.swayPhase = config.swayPhase ?? Math.random() * Math.PI * 2;
        this.opacity = config.opacity ?? 1.0;
        this.flipped = config.flipped ?? false;
        this.depth = config.depth ?? 1.0;
        this.currentRotation = this.baseRotation;
    }

    update(time: number, mouseNormX: number = 0, mouseNormY: number = 0) {
        // Natural wind sway calculation
        const windSway = Math.sin(time * this.swaySpeed + this.swayPhase) * this.swayAmount;
        const windGust = Math.sin(time * 0.3 + this.swayPhase * 0.5) * (this.swayAmount * 0.5);

        // Parallax reaction to mouse
        this.targetXOffset = mouseNormX * (20 * this.depth);
        this.targetYOffset = mouseNormY * (15 * this.depth);
        this.currentXOffset += (this.targetXOffset - this.currentXOffset) * 0.05;
        this.currentYOffset += (this.targetYOffset - this.currentYOffset) * 0.05;

        this.currentRotation = this.baseRotation + windSway + windGust;
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x + this.currentXOffset, this.y + this.currentYOffset);
        ctx.rotate(this.currentRotation);
        if (this.flipped) {
            ctx.scale(-this.baseScale, this.baseScale);
        } else {
            ctx.scale(this.baseScale, this.baseScale);
        }
        ctx.globalAlpha = this.opacity;

        drawMonsteraLeafShape(ctx);

        ctx.restore();
    }
}

/**
 * Draws a single high-fidelity Monstera leaf centered roughly around (0, 0)
 * with stem starting at (0, 160) and tip reaching (-10, -180).
 */
export function drawMonsteraLeafShape(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Petiole / Stem (curved stalk at the base)
    ctx.beginPath();
    ctx.moveTo(-4, 180);
    ctx.bezierCurveTo(-3, 140, -2, 90, -1, 30);
    ctx.bezierCurveTo(-1, -40, -4, -100, -8, -165);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#438c1b";
    ctx.lineCap = "round";
    ctx.stroke();

    // Stem highlight
    ctx.beginPath();
    ctx.moveTo(-2, 175);
    ctx.bezierCurveTo(-1, 135, 0, 85, 1, 30);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#80c427";
    ctx.stroke();

    // 2. Leaf Blade Silhouette (Full perimeter with characteristic monstera deep lobes)
    // We draw the left half and right half using exact curves matching the user's reference.
    ctx.beginPath();

    // Start at leaf base / petiole junction
    ctx.moveTo(0, 120);

    // --- RIGHT SIDE OF LEAF (Looking at leaf upright) ---
    // Basal lobe 1
    ctx.bezierCurveTo(20, 125, 45, 120, 65, 105);
    ctx.bezierCurveTo(80, 90, 88, 68, 70, 52);
    // Sinus cut 1 (deep notch toward center)
    ctx.bezierCurveTo(55, 40, 38, 48, 25, 52);
    // Lobe 2
    ctx.bezierCurveTo(48, 40, 85, 42, 115, 25);
    ctx.bezierCurveTo(135, 12, 140, -10, 122, -25);
    // Sinus cut 2
    ctx.bezierCurveTo(100, -35, 75, -28, 40, -15);
    // Lobe 3 (widest part)
    ctx.bezierCurveTo(70, -25, 115, -35, 145, -60);
    ctx.bezierCurveTo(165, -80, 160, -110, 130, -125);
    // Sinus cut 3
    ctx.bezierCurveTo(105, -130, 80, -115, 38, -80);
    // Lobe 4 (upper lobe)
    ctx.bezierCurveTo(65, -95, 105, -125, 115, -155);
    ctx.bezierCurveTo(120, -175, 100, -195, 75, -195);
    // Sinus cut 4
    ctx.bezierCurveTo(60, -190, 48, -170, 20, -140);
    // Lobe 5 & Tip transition
    ctx.bezierCurveTo(32, -165, 45, -190, 30, -210);
    ctx.bezierCurveTo(15, -225, 5, -230, -8, -235); // Apex Tip

    // --- LEFT SIDE OF LEAF ---
    // Tip down to upper left lobe
    ctx.bezierCurveTo(-22, -225, -42, -200, -45, -180);
    // Sinus cut left 1
    ctx.bezierCurveTo(-40, -165, -30, -150, -15, -135);
    // Left Lobe 2
    ctx.bezierCurveTo(-38, -150, -78, -165, -115, -150);
    ctx.bezierCurveTo(-140, -135, -145, -105, -125, -85);
    // Sinus cut left 2
    ctx.bezierCurveTo(-105, -70, -75, -65, -35, -50);
    // Left Lobe 3 (widest lateral lobe)
    ctx.bezierCurveTo(-70, -60, -125, -65, -155, -40);
    ctx.bezierCurveTo(-175, -15, -165, 20, -135, 35);
    // Sinus cut left 3
    ctx.bezierCurveTo(-110, 45, -80, 30, -30, 15);
    // Left Lobe 4 (lower lateral)
    ctx.bezierCurveTo(-55, 35, -105, 50, -120, 75);
    ctx.bezierCurveTo(-130, 98, -110, 125, -80, 125);
    // Sinus cut left 4
    ctx.bezierCurveTo(-65, 120, -45, 95, -20, 65);
    // Basal auricle lobe
    ctx.bezierCurveTo(-30, 85, -45, 115, -35, 135);
    ctx.bezierCurveTo(-25, 145, -10, 140, 0, 120);

    ctx.closePath();

    // Fill with lush tropical gradient (lime/emerald to deep forest green)
    const leafGrad = ctx.createLinearGradient(-150, -200, 140, 120);
    leafGrad.addColorStop(0, "#8ed428");   // Bright fresh green highlight at top
    leafGrad.addColorStop(0.3, "#65ba1d"); // Vibrant tropical green
    leafGrad.addColorStop(0.7, "#429318"); // Mid-tone leafy green
    leafGrad.addColorStop(1, "#276813");   // Deep forest green at base

    ctx.fillStyle = leafGrad;
    ctx.fill();

    // Subtle edge contour for crisp cartoon-vector finish
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#235c10";
    ctx.stroke();

    // 3. Central Rachis (Primary leaf vein)
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.bezierCurveTo(0, 50, -2, -30, -8, -230);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = "#9ee33d";
    ctx.stroke();

    // 4. Characteristic Monstera Fenestrations (Interior oval holes)
    // In Monstera deliciosa, these holes form near the midrib between lateral veins
    const drawFenestration = (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        rot: number
    ) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0)"; // Cut out or reveal background
        // In Canvas 2D, we can clear or draw with globalCompositeOperation = 'destination-out'
        ctx.restore();
    };

    // To cleanly carve out fenestrations matching the reference:
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    // Right side interior holes
    drawHole(ctx, 42, -55, 14, 38, 0.45);
    drawHole(ctx, 38, 8, 12, 28, 0.35);
    drawHole(ctx, 35, -115, 10, 24, 0.55);

    // Left side interior holes
    drawHole(ctx, -38, -25, 14, 36, -0.4);
    drawHole(ctx, -42, 35, 12, 26, -0.3);
    drawHole(ctx, -28, -85, 11, 28, -0.5);

    ctx.restore();

    // 5. Vein Accents & Ribs (Subtle highlights radiating from central vein)
    ctx.save();
    ctx.strokeStyle = "rgba(165, 235, 65, 0.45)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    // Right veins
    drawVein(ctx, 0, 75, 45, 65);
    drawVein(ctx, 0, 25, 68, 5);
    drawVein(ctx, -2, -35, 78, -65);
    drawVein(ctx, -4, -95, 65, -135);

    // Left veins
    drawVein(ctx, 0, 60, -48, 50);
    drawVein(ctx, -1, 5, -72, -15);
    drawVein(ctx, -3, -55, -80, -90);
    drawVein(ctx, -5, -115, -60, -155);

    ctx.restore();

    ctx.restore();
}

/** Helper to carve out smooth organic oval holes */
function drawHole(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    angle: number
) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Helper to draw secondary veins */
function drawVein(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + 5, (y1 + y2) / 2 - 4, x2, y2);
    ctx.stroke();
}
