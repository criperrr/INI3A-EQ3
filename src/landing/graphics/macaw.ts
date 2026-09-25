/**
 * Presco Landing Page - Procedural Arara-Canindé (Blue-and-Yellow Macaw)
 * 100% Canvas 2D Vector Rendering & Wing Flapping Kinematics
 * Based strictly on user's reference illustration.
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

/**
 * Draws the high-fidelity Arara-Canindé matching the reference illustration.
 * @param flap Wing flap progress from -1.0 (wings down) to +1.0 (wings high up)
 */
export function drawAraraCaninde(ctx: CanvasRenderingContext2D, flap: number = 0) {
    ctx.save();

    // 1. Far Wing (Left Wing, pointing upwards/backwards in reference)
    // Flap modulates the wing elevation and tip flex
    const farWingLift = flap * 24; // Wing flaps up and down
    ctx.save();
    ctx.beginPath();
    // Shoulder base
    ctx.moveTo(10, -20);
    // Upper contour reaching high
    ctx.bezierCurveTo(30, -70 - farWingLift, 70, -130 - farWingLift * 1.3, 85, -170 - farWingLift * 1.5);
    // Wing tip (primary flight feathers with characteristic serrated tips)
    ctx.bezierCurveTo(90, -175 - farWingLift * 1.5, 75, -150 - farWingLift, 65, -135 - farWingLift);
    ctx.bezierCurveTo(72, -125 - farWingLift, 55, -100 - farWingLift, 48, -85 - farWingLift);
    ctx.bezierCurveTo(55, -75 - farWingLift, 35, -50, 25, -35);
    // Trailing edge back to body
    ctx.bezierCurveTo(15, -20, 5, -15, 0, -10);
    ctx.closePath();

    // Far wing gradient (Rich cobalt to vibrant azure)
    const farWingGrad = ctx.createLinearGradient(10, -20, 85, -170);
    farWingGrad.addColorStop(0, "#014f9e");
    farWingGrad.addColorStop(0.5, "#0077b6");
    farWingGrad.addColorStop(1, "#0096c7");
    ctx.fillStyle = farWingGrad;
    ctx.fill();

    // Feather notches highlight on far wing
    ctx.strokeStyle = "#00b4d8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. Long Graduated Tail Feathers (Trailing back and down)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-45, 15); // Tail root at back of pelvis
    // Top blue curved line
    ctx.bezierCurveTo(-100, 45, -170, 95, -240, 160);
    // Tail tip (sharp tapered point)
    ctx.bezierCurveTo(-238, 158, -210, 130, -180, 110);
    // Lower yellow/gold underside edge
    ctx.bezierCurveTo(-140, 80, -90, 45, -40, 30);
    ctx.closePath();

    // Dual gradient on tail: Blue on dorsal, yellow on ventral edge
    const tailGrad = ctx.createLinearGradient(-45, 15, -240, 160);
    tailGrad.addColorStop(0, "#0077b6");
    tailGrad.addColorStop(0.4, "#023e8a");
    tailGrad.addColorStop(0.7, "#ffa200");
    tailGrad.addColorStop(1, "#ffb703");
    ctx.fillStyle = tailGrad;
    ctx.fill();

    // Tail feather spine striations
    ctx.beginPath();
    ctx.moveTo(-45, 18);
    ctx.bezierCurveTo(-110, 50, -180, 105, -235, 155);
    ctx.strokeStyle = "#03045e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner yellow tail feathers layer
    ctx.beginPath();
    ctx.moveTo(-40, 25);
    ctx.bezierCurveTo(-90, 60, -140, 95, -185, 125);
    ctx.bezierCurveTo(-160, 95, -110, 60, -42, 28);
    ctx.fillStyle = "#ffb703";
    ctx.fill();
    ctx.restore();

    // 3. Talons / Feet (Tucked under belly in aerodynamic flight)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-25, 38);
    ctx.lineTo(-20, 52);
    ctx.lineTo(-15, 48);
    ctx.lineTo(-12, 54);
    ctx.lineTo(-8, 45);
    ctx.strokeStyle = "#7c5328";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();

    // 4. Main Body: Golden Yellow Breast & Abdomen
    ctx.save();
    ctx.beginPath();
    // Neck to chest curve
    ctx.moveTo(35, -10);
    // Bulging muscular breast
    ctx.bezierCurveTo(65, 0, 75, 25, 60, 48);
    // Belly line
    ctx.bezierCurveTo(45, 65, 0, 65, -35, 42);
    // Lower back / rump junction
    ctx.bezierCurveTo(-45, 30, -40, 10, -25, -5);
    // Back line up to nape
    ctx.bezierCurveTo(-10, -15, 10, -18, 35, -10);
    ctx.closePath();

    // Vibrant Sunny Yellow / Amber body gradient
    const bodyGrad = ctx.createLinearGradient(40, -10, 10, 60);
    bodyGrad.addColorStop(0, "#ffe066");  // Highlight near throat
    bodyGrad.addColorStop(0.3, "#ffb703"); // Golden yellow core
    bodyGrad.addColorStop(0.8, "#fb8500"); // Warm amber shading
    bodyGrad.addColorStop(1, "#d46b08");   // Shadow underside
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Serrated feather contours on yellow chest
    ctx.beginPath();
    ctx.moveTo(35, 15);
    ctx.quadraticCurveTo(42, 22, 38, 28);
    ctx.quadraticCurveTo(46, 34, 40, 42);
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 5. Near Wing (Right Wing - Dominant in foreground)
    // In the reference, this wing spreads wide with golden-yellow under-coverts
    // and brilliant blue flight feathers with serrated primary tips.
    const nearWingFlap = flap * 18;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(25, 0); // Shoulder
    // Forward curve of the wing
    ctx.bezierCurveTo(-10, 10 - nearWingFlap * 0.5, -60, 20 - nearWingFlap, -120, -10 - nearWingFlap * 1.4);
    // Wing tip primaries (long flight feathers pointing back/left)
    ctx.bezierCurveTo(-145, -20 - nearWingFlap * 1.5, -135, -5 - nearWingFlap, -115, 10 - nearWingFlap);
    // Feather step 2
    ctx.bezierCurveTo(-125, 18 - nearWingFlap, -105, 25 - nearWingFlap, -85, 30 - nearWingFlap * 0.5);
    // Feather step 3
    ctx.bezierCurveTo(-95, 36 - nearWingFlap * 0.3, -75, 42, -50, 40);
    // Wing base back to body
    ctx.bezierCurveTo(-25, 35, 5, 20, 25, 0);
    ctx.closePath();

    // Dual tone on near wing: Upper part yellow, outer edge brilliant blue
    const nearWingGrad = ctx.createLinearGradient(20, 0, -120, 10);
    nearWingGrad.addColorStop(0, "#ffb703");
    nearWingGrad.addColorStop(0.4, "#ffa200");
    nearWingGrad.addColorStop(0.75, "#0077b6");
    nearWingGrad.addColorStop(1, "#023e8a");
    ctx.fillStyle = nearWingGrad;
    ctx.fill();

    // Distinct Blue primary wing covert band
    ctx.beginPath();
    ctx.moveTo(15, -8);
    ctx.bezierCurveTo(-20, -2, -70, -2, -120, -10 - nearWingFlap * 1.4);
    ctx.bezierCurveTo(-95, 10 - nearWingFlap, -50, 10, 0, 5);
    ctx.closePath();
    ctx.fillStyle = "#0077b6";
    ctx.fill();
    ctx.restore();

    // 6. Blue Mantle & Nape (Back of neck and shoulders)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(35, -10);
    ctx.bezierCurveTo(45, -18, 55, -20, 70, -18); // Nape
    ctx.bezierCurveTo(55, -8, 40, -5, 25, -2);
    ctx.closePath();
    ctx.fillStyle = "#0077b6";
    ctx.fill();
    ctx.restore();

    // 7. Head, Face Mask, Green Forehead & Hooked Beak
    ctx.save();
    ctx.translate(65, -12); // Position at head center

    // Head base (Golden yellow throat transition to white cheek)
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.bezierCurveTo(5, 18, 20, 15, 28, 8);
    ctx.bezierCurveTo(32, 0, 30, -12, 18, -18);
    ctx.bezierCurveTo(0, -20, -15, -12, -10, 10);
    ctx.fillStyle = "#ffb703";
    ctx.fill();

    // White Cheek Patch (Distinctive bare skin mask of the macaw)
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.bezierCurveTo(22, 10, 26, 0, 24, -8);
    ctx.bezierCurveTo(18, -16, 5, -15, 2, -5);
    ctx.bezierCurveTo(0, 0, 2, 4, 8, 5);
    ctx.closePath();
    ctx.fillStyle = "#f8f9fa";
    ctx.fill();

    // Characteristic fine black facial striations / lines on white mask
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.quadraticCurveTo(14, -1, 20, 2);
    ctx.moveTo(8, -6);
    ctx.quadraticCurveTo(15, -6, 21, -3);
    ctx.moveTo(11, -10);
    ctx.quadraticCurveTo(16, -10, 20, -7);
    ctx.stroke();

    // Eye (Dark iris with tiny white specular sparkle)
    ctx.beginPath();
    ctx.arc(14, -7, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(15, -8, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Green Forehead Patch (Iconic emerald green crown of Arara-canindé)
    ctx.beginPath();
    ctx.moveTo(5, -14);
    ctx.bezierCurveTo(12, -22, 22, -20, 26, -14);
    ctx.bezierCurveTo(24, -10, 18, -12, 10, -12);
    ctx.closePath();
    const greenGrad = ctx.createLinearGradient(5, -20, 26, -12);
    greenGrad.addColorStop(0, "#8ed428");
    greenGrad.addColorStop(1, "#438c1b");
    ctx.fillStyle = greenGrad;
    ctx.fill();

    // Large Hooked Black Beak (Upper culmen curved down sharply)
    ctx.beginPath();
    ctx.moveTo(22, -14);
    // Sharp curve of upper beak culmen
    ctx.bezierCurveTo(34, -12, 42, -2, 40, 14);
    // Hook tip curling down
    ctx.bezierCurveTo(38, 18, 35, 18, 34, 12);
    // Lower cutting edge
    ctx.bezierCurveTo(32, 5, 26, 0, 22, -2);
    ctx.closePath();

    const beakGrad = ctx.createLinearGradient(22, -14, 40, 14);
    beakGrad.addColorStop(0, "#2c333a");
    beakGrad.addColorStop(0.5, "#181d22");
    beakGrad.addColorStop(1, "#0a0c0e");
    ctx.fillStyle = beakGrad;
    ctx.fill();

    // Lower Mandible (Smaller black jaw below)
    ctx.beginPath();
    ctx.moveTo(22, 2);
    ctx.lineTo(29, 3);
    ctx.bezierCurveTo(30, 8, 26, 12, 22, 10);
    ctx.closePath();
    ctx.fillStyle = "#111417";
    ctx.fill();

    ctx.restore();

    ctx.restore();
}
