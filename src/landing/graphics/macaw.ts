/**
 * Presco Landing Page - Procedural Arara-Canindé (Blue-and-Yellow Macaw)
 * 100% Canvas 2D Vector Rendering & Wing Flapping Kinematics
 *
 * v3: redrawn directly against a reference photo of Ara ararauna in
 * flight (wings fully spread, head turned down, banking). Key shape
 * corrections vs. earlier passes:
 *  - Wings are no longer single flat shapes: each wing is built from
 *    individually rendered, tapered primary/secondary feathers fanned
 *    out from a shoulder joint and a wrist joint (two-segment wing),
 *    which is what actually reads as "feathers" instead of a blob.
 *  - Color follows the photo, not a generic two-tone scheme: the far
 *    (raised, upstroke) wing runs blue at the root into warm
 *    golden-tan at the tips; the near (lowered, downstroke) wing runs
 *    light cyan-blue at the root into near-black at the tips, with
 *    thin dark separation lines between feathers.
 *  - The tail keeps one elongated central feather that trails visibly
 *    further than its neighbors, matching the single long streaming
 *    feather visible in the photo.
 *  - Head: larger bare white facial mask with denser fine striping,
 *    bigger and more strongly hooked black beak, green-to-gold crown.
 */

export interface MacawFlightState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    scale: number;
    flapSpeed: number;
    time: number;
    targetX: number;
    targetY: number;
    state: "cruising" | "swooping" | "gliding";
    direction: 1 | -1; // 1 = facing right, -1 = facing left
}

export class AnimatedMacaw {
    x: number;
    y: number;
    vx: number;
    vy: number;
    scale: number;
    targetScale: number;
    flapSpeed: number = 7.5; // Flap frequency
    flapPhase: number = 0;
    bankAngle: number = 0;
    direction: 1 | -1 = 1;
    gliding: boolean = false;
    bounds: { width: number; height: number } = { width: 1200, height: 800 };

    // Waypoint patrol navigation
    waypoints: { x: number; y: number }[] = [];
    currentWaypointIndex: number = 0;

    constructor(initialX: number = -150, initialY: number = 180, scale: number = 0.55) {
        this.x = initialX;
        this.y = initialY;
        this.vx = 2.4;
        this.vy = 0.4;
        this.scale = scale;
        this.targetScale = scale;
    }

    setBounds(width: number, height: number) {
        this.bounds = { width, height };
        this.generateWaypoints();
    }

    generateWaypoints() {
        const w = this.bounds.width;
        const h = Math.min(this.bounds.height, 700);

        this.waypoints = [
            { x: -120, y: h * 0.25 },
            { x: w * 0.3, y: h * 0.18 },
            { x: w * 0.65, y: h * 0.35 },
            { x: w + 150, y: h * 0.2 },
            // Loop back from the other direction
            { x: w + 120, y: h * 0.45 },
            { x: w * 0.6, y: h * 0.5 },
            { x: w * 0.2, y: h * 0.3 },
            { x: -150, y: h * 0.38 },
        ];
    }

    update(timeDelta: number, mouseX?: number, mouseY?: number) {
        if (this.waypoints.length === 0) {
            this.generateWaypoints();
        }

        const target = this.waypoints[this.currentWaypointIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Advance to next waypoint when close
        if (dist < 120) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        }

        // Steer smoothly towards target waypoint
        const desiredSpeed = 2.6;
        const desiredVx = (dx / dist) * desiredSpeed;
        const desiredVy = (dy / dist) * desiredSpeed;

        // Mouse attraction / curiosity: If mouse is in hero, macaw banks slightly towards it
        let influenceVx = 0;
        let influenceVy = 0;
        if (mouseX !== undefined && mouseY !== undefined && mouseX > 0 && mouseY > 0) {
            const mdx = mouseX - this.x;
            const mdy = mouseY - this.y;
            const mdist = Math.hypot(mdx, mdy);
            if (mdist < 350 && mdist > 60) {
                influenceVx = (mdx / mdist) * 0.8;
                influenceVy = (mdy / mdist) * 0.6;
            }
        }

        // Apply smooth acceleration
        this.vx += (desiredVx + influenceVx - this.vx) * 0.035;
        this.vy += (desiredVy + influenceVy - this.vy) * 0.035;

        // Position update
        this.x += this.vx;
        this.y += this.vy;

        // Update direction and banking
        this.direction = this.vx >= 0 ? 1 : -1;
        const flightAngle = Math.atan2(this.vy, Math.abs(this.vx));
        this.bankAngle += (flightAngle - this.bankAngle) * 0.1;

        // Wing flap mechanics (glide when descending fast, flap when climbing or cruising)
        if (this.vy < -0.3) {
            this.flapSpeed = 8.5; // Flap faster when ascending
            this.gliding = false;
        } else if (this.vy > 1.2 && Math.random() < 0.05) {
            this.gliding = true; // Occasional glide when descending
        } else {
            this.flapSpeed = 6.2;
            this.gliding = false;
        }

        if (!this.gliding) {
            this.flapPhase += this.flapSpeed * timeDelta;
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.save();

        // Calculate wing flap vertical offset and flex
        const flapSin = this.gliding ? 0.2 : Math.sin(this.flapPhase);
        const bobbing = Math.cos(this.flapPhase) * 3; // Natural body bobbing

        ctx.translate(this.x, this.y + bobbing);
        ctx.scale(this.direction * this.scale, this.scale);
        ctx.rotate(this.bankAngle * 0.7);

        drawAraraCaninde(ctx, flapSin);

        ctx.restore();
    }
}

// ----------------------------------------------------------------------
// Internal drawing helpers
// ----------------------------------------------------------------------

interface FeatherSpec {
    off: number; // degrees, added to the wing/tail's base angle
    len: number;
    w: number;
}

/**
 * Draws ONE solid, continuous feather fan from a shared root: root ->
 * tip 1 -> notch -> tip 2 -> notch -> ... -> tip N -> root. Because it
 * is a single filled polygon (not N separate feather shapes), the base
 * never shows gaps between feathers the way discrete shapes do - only
 * the trailing edge is serrated, exactly like a real spread wing/tail.
 * Individual shaft lines are drawn on top from the root to each tip to
 * read as separate feathers without breaking up the silhouette.
 *
 * Angles are in degrees, 0 = local +x. Assumes the canvas is already
 * translated to the fan's root joint (shoulder / wrist / tail base).
 */
function featherFan(
    ctx: CanvasRenderingContext2D,
    specs: FeatherSpec[],
    baseAngleDeg: number,
    colorNear: string,
    colorFar: string,
    shaftAlpha: number = 0.3,
    notchDepth: number = 0.86,
    colorMid?: string
) {
    const pts = specs.map((s) => {
        const rad = ((baseAngleDeg + s.off) * Math.PI) / 180;
        return { rad, len: s.len, x: Math.cos(rad) * s.len, y: Math.sin(rad) * s.len };
    });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
        if (i < pts.length - 1) {
            const notchLen = Math.min(pts[i].len, pts[i + 1].len) * notchDepth;
            const midRad = (pts[i].rad + pts[i + 1].rad) / 2;
            ctx.lineTo(Math.cos(midRad) * notchLen, Math.sin(midRad) * notchLen);
        }
    }
    ctx.closePath();

    const mid = pts[Math.floor(pts.length / 2)];
    const g = ctx.createLinearGradient(0, 0, mid.x, mid.y);
    g.addColorStop(0, colorNear);
    if (colorMid) g.addColorStop(0.6, colorMid);
    g.addColorStop(1, colorFar);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(3,10,26,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // shaft lines suggesting the separate vanes, without cutting gaps
    ctx.strokeStyle = `rgba(3,10,26,${shaftAlpha})`;
    ctx.lineWidth = 0.6;
    for (const p of pts) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.x * 0.96, p.y * 0.96);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Draws one full wing as a two-segment fan (secondaries off the
 * shoulder, primaries off the wrist) so the spread reads as real
 * feathers rather than a single paddle shape.
 *
 * @param rootX/rootY shoulder position, in body-local coordinates
 * @param flap        -1 (down) .. +1 (up), same signal driving the body
 * @param isFar        true for the back/upstroke wing (smaller, duller,
 *                      gold-tipped); false for the dominant front wing
 */
function drawWing(
    ctx: CanvasRenderingContext2D,
    rootX: number,
    rootY: number,
    flap: number,
    isFar: boolean
) {
    const scaleMul = isFar ? 0.74 : 1;

    // The two wings are stylized as a soaring/banking silhouette (as in
    // the reference): the far wing stays mostly UP (angle near 270 =
    // straight up), the near wing stays mostly DOWN (angle near 90 =
    // straight down), and `flap` nudges both together within a narrow
    // band so the beat animates without ever swinging the wing all the
    // way back to the tail's angle (~183deg) and colliding with it.
    // (0deg = toward the head/+x, 90deg = straight down, 270deg = up.)
    const rootAngleDeg = isFar ? 255 + flap * 16 : 108 + flap * 16;

    // ONE continuous fan per wing (not a separate arm/hand pair) so the
    // whole wing reads as a single connected surface: the base never
    // shows gaps, only the trailing tips are serrated. Offsets sweep
    // monotonically from the trailing secondaries (closest to the
    // body/tail) to the long outer primaries (swept furthest from the
    // body) - mirrored between the two wings since they open in
    // opposite rotational directions.
    const dir = isFar ? 1 : -1;
    const specs: FeatherSpec[] = [
        { off: dir * -50, len: 34 * scaleMul, w: 18 * scaleMul },
        { off: dir * -38, len: 46 * scaleMul, w: 22 * scaleMul },
        { off: dir * -26, len: 56 * scaleMul, w: 26 * scaleMul },
        { off: dir * -14, len: 62 * scaleMul, w: 28 * scaleMul },
        { off: dir * -2, len: 68 * scaleMul, w: 26 * scaleMul },
        { off: dir * 10, len: 104 * scaleMul, w: 23 * scaleMul },
        { off: dir * 22, len: 134 * scaleMul, w: 20 * scaleMul },
        { off: dir * 34, len: 152 * scaleMul, w: 18 * scaleMul },
        { off: dir * 46, len: 142 * scaleMul, w: 15 * scaleMul },
        { off: dir * 58, len: 108 * scaleMul, w: 12 * scaleMul },
    ];

    // Colors: front (near) wing shows its topside - light cyan-blue at
    // the root deepening to near-black at the tips, per the reference
    // photo. Back (far) wing shows more of its underside - blue at the
    // root warming into a golden-tan tip.
    const colorA = isFar ? "#1f6fa0" : "#4fc3ec";
    const colorB = isFar ? "#e0b559" : "#071b33";
    const colorMid = isFar ? "#4fa0a0" : undefined; // bridges blue->gold without a muddy olive blend

    ctx.save();
    ctx.translate(rootX, rootY);
    featherFan(ctx, specs, rootAngleDeg, colorA, colorB, isFar ? 0.22 : 0.32, 0.86, colorMid);
    ctx.restore();
}

/**
 * Draws the tail as a fan of individually tapered feathers with one
 * elongated central feather trailing further than its neighbors,
 * matching the single long streaming feather visible in the reference
 * photo.
 */
function drawTail(ctx: CanvasRenderingContext2D, rootX: number, rootY: number) {
    const baseAngle = 183; // ~straight back, very slight downward droop
    const specs: FeatherSpec[] = [
        { off: -20, len: 168, w: 15 },
        { off: -10, len: 192, w: 16 },
        { off: 0, len: 238, w: 15 }, // the long streaming central feather
        { off: 10, len: 188, w: 16 },
        { off: 20, len: 160, w: 15 },
        { off: 29, len: 130, w: 14 },
    ];
    ctx.save();
    ctx.translate(rootX, rootY);
    featherFan(ctx, specs, baseAngle, "#34b0de", "#123a63", 0.3);
    ctx.restore();
}

/**
 * Draws a high-fidelity Arara-Canindé (Ara ararauna) in flight, facing +x
 * (use ctx.scale(-1,1) upstream to flip, as AnimatedMacaw.render does).
 *
 * Coordinate frame: origin sits at the shoulder / wing root, roughly the
 * bird's center of mass. +x = towards the head/chest, -x = towards the
 * tail, +y = down.
 *
 * @param flap Wing flap progress from -1.0 (wings fully down) to +1.0
 *             (wings raised high above the back)
 */
export function drawAraraCaninde(ctx: CanvasRenderingContext2D, flap: number = 0) {
    ctx.save();

    // ------------------------------------------------------------------
    // 1. FAR WING (raised/upstroke side, partially behind the body) -
    //    blue at the root warming to golden-tan at the tips
    // ------------------------------------------------------------------
    drawWing(ctx, 8, -20, flap, true);

    // ------------------------------------------------------------------
    // 2. TAIL
    // ------------------------------------------------------------------
    drawTail(ctx, -38, 6);

    // ------------------------------------------------------------------
    // 3. LEGS / TALONS (tucked under the belly, grey with black claws)
    // ------------------------------------------------------------------
    ctx.save();
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, 34);
    ctx.lineTo(-14, 50);
    ctx.stroke();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 50); ctx.lineTo(-22, 58);
    ctx.moveTo(-14, 50); ctx.lineTo(-13, 60);
    ctx.moveTo(-14, 50); ctx.lineTo(-6, 56);
    ctx.stroke();
    ctx.restore();

    // ------------------------------------------------------------------
    // 4. BODY - compact rounded torso: blue mantle on top, golden chest
    //    and belly below, narrowing to the tail base
    // ------------------------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(38, -24); // base of neck / nape
    ctx.bezierCurveTo(62, -18, 74, 4, 66, 30);
    ctx.bezierCurveTo(60, 48, 40, 58, 18, 56);
    ctx.bezierCurveTo(-2, 54, -20, 42, -34, 22);
    ctx.bezierCurveTo(-40, 10, -38, -8, -26, -20);
    ctx.bezierCurveTo(-10, -30, 18, -32, 38, -24);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(40, -24, 10, 56);
    bodyGrad.addColorStop(0, "#0069a8");
    bodyGrad.addColorStop(0.28, "#ffe066");
    bodyGrad.addColorStop(0.55, "#ffb703");
    bodyGrad.addColorStop(0.85, "#fb8500");
    bodyGrad.addColorStop(1, "#d46b08");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(234,88,12,0.4)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(30 - i * 10, -2 + i * 10);
        ctx.quadraticCurveTo(40 - i * 8, 4 + i * 10, 32 - i * 10, 14 + i * 10);
        ctx.stroke();
    }
    ctx.restore();

    // ------------------------------------------------------------------
    // 5. NEAR WING (lowered/downstroke side, dominant foreground wing) -
    //    light cyan-blue at the root deepening to near-black tips, with
    //    crisp dark lines separating each primary
    // ------------------------------------------------------------------
    drawWing(ctx, 26, -12, flap, false);

    // ------------------------------------------------------------------
    // 6. HEAD - small and round relative to the body, turned slightly
    //    downward, with a large bare white facial mask and a heavy,
    //    strongly hooked black beak
    // ------------------------------------------------------------------
    ctx.save();
    const headX = 56, headY = -28;
    ctx.translate(headX, headY);
    ctx.rotate(0.22); // slight downward tilt, matching the reference pose

    // Throat / neck feathering
    ctx.beginPath();
    ctx.moveTo(-20, 18);
    ctx.quadraticCurveTo(-4, 27, 10, 21);
    ctx.quadraticCurveTo(-4, 11, -20, 18);
    ctx.fillStyle = "#ffb703";
    ctx.fill();

    // Skull
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb703";
    ctx.fill();

    // Green-to-gold crown patch
    ctx.beginPath();
    ctx.moveTo(-10, -17);
    ctx.quadraticCurveTo(3, -25, 16, -16);
    ctx.quadraticCurveTo(18, -9, 11, -8);
    ctx.quadraticCurveTo(-2, -13, -10, -9);
    ctx.closePath();
    const greenGrad = ctx.createLinearGradient(-10, -22, 16, -8);
    greenGrad.addColorStop(0, "#a3d92c");
    greenGrad.addColorStop(1, "#3f7d17");
    ctx.fillStyle = greenGrad;
    ctx.fill();

    // Large bare white facial mask - covers cheek from crown down past
    // the eye to the base of the beak, leaving crown/nape feathered
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.bezierCurveTo(13, -16, 23, -9, 24, 4);
    ctx.bezierCurveTo(25, 14, 16, 20, 6, 16);
    ctx.bezierCurveTo(-3, 12, -4, -3, 0, -9);
    ctx.closePath();
    ctx.fillStyle = "#fdfbf6";
    ctx.fill();

    // Dense fine black facial feather-lines across the mask
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -5); ctx.quadraticCurveTo(11, -4, 19, 0);
    ctx.moveTo(1, 0);  ctx.quadraticCurveTo(10, 1, 18, 4);
    ctx.moveTo(0, 5);  ctx.quadraticCurveTo(9, 6, 16, 8);
    ctx.moveTo(1, 10); ctx.quadraticCurveTo(8, 11, 14, 12);
    ctx.stroke();

    // Eye - dark iris + white catch-light + thin pale ring
    ctx.beginPath();
    ctx.arc(10, -2, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -3, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -2, 4.4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cere (fleshy patch atop the beak, nostril)
    ctx.beginPath();
    ctx.ellipse(18, -9, 3.4, 2.4, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#4b5563";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(17.4, -9, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();

    // Large, deeply hooked black beak - upper mandible curls down
    // sharply, almost forming a semicircle, matching the reference
    ctx.beginPath();
    ctx.moveTo(15, -14);
    ctx.bezierCurveTo(29, -15, 41, -4, 39, 12);
    ctx.bezierCurveTo(38, 22, 30, 27, 25, 19);
    ctx.bezierCurveTo(29, 10, 26, -1, 17, -4);
    ctx.closePath();
    const beakGrad = ctx.createLinearGradient(15, -14, 39, 22);
    beakGrad.addColorStop(0, "#3a3f45");
    beakGrad.addColorStop(0.5, "#181c20");
    beakGrad.addColorStop(1, "#040506");
    ctx.fillStyle = beakGrad;
    ctx.fill();

    // Culmen ridge highlight
    ctx.beginPath();
    ctx.moveTo(17, -12);
    ctx.quadraticCurveTo(31, -9, 35, 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Lower mandible
    ctx.beginPath();
    ctx.moveTo(17, -1);
    ctx.bezierCurveTo(24, 0, 28, 6, 26, 14);
    ctx.bezierCurveTo(21, 16, 16, 12, 15, 5);
    ctx.closePath();
    ctx.fillStyle = "#101418";
    ctx.fill();

    ctx.restore();

    ctx.restore();
}