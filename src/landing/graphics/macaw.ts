/**
 * Presco Landing Page - Procedural Arara-Canindé (Ara ararauna)
 * 100% Canvas 2D Vector Rendering & Wing Flapping Kinematics
 *
 * v4: anatomia refeita a partir de fotos de araras-canindé em voo e de fichas
 * de biometria (comprimento total ~76-86 cm, envergadura ~104-115 cm, cauda
 * ~metade do comprimento total, garganta preta, face branca com linhas de
 * penugem preta, íris amarela, bico preto fortemente curvo, vent e
 * sub-caudais azuis, face inferior da cauda amarelo-oliva).
 *
 * Mudanças em relação à v3:
 *  - Corpo: silhueta alongada (torpedo) em vez de oval; dorso azul-turquesa
 *    com borda "escamada" de penas sobre peito/ventre dourado-alaranjado;
 *    obliquamente afilado até a base da cauda, onde as tectrizes caudais
 *    azuis fazem a transição para a cauda (nada de "bocal de turbina").
 *  - Asas: esqueleto de 3 juntas (ombro -> cotovelo -> punho -> mão) com
 *    defasagem (lag) entre as juntas durante o batimento, e camadas de
 *    penas individuais: terciárias, secundárias, 10 primárias com pontas
 *    separadas (efeito "dedos"), coberteiras maiores/médias/menores e alula.
 *    A asa distante mostra a face inferior (dourado/oliva, pontas quase
 *    pretas); a asa próxima mostra o dorso (turquesa -> azul-real -> marinho).
 *  - Cauda: longa, estreita e graduada - penas quase paralelas que convergem
 *    para uma ponta fina, com ondulação suave que segue o batimento e uma
 *    faixa dourado-oliva na face inferior.
 *  - Cabeça: máscara facial branca, linhas pontilhadas de penugem, babador
 *    preto, íris amarela, cere/narina, testa verde -> nuca turquesa e bico
 *    preto muito curvo (maxila com ponta em gancho sobre a mandíbula).
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

/** Informações extras da pose, usadas para a cinemática secundária (lag das juntas, ondulação da cauda). */
export interface MacawPose {
    /** Fase do batimento em radianos (a mesma que gera `flap = sin(phase)`). */
    phase?: number;
    /** Planando: asas abertas e paradas, cauda quase reta. */
    gliding?: boolean;
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

        drawAraraCaninde(ctx, flapSin, { phase: this.flapPhase, gliding: this.gliding });

        ctx.restore();
    }
}

// ----------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------

const DEG = Math.PI / 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function parseHex(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mistura duas cores #rrggbb (t = 0 -> a, t = 1 -> b). Retorna rgb(). */
function mixHex(a: string, b: string, t: number): string {
    const [ar, ag, ab] = parseHex(a);
    const [br, bg, bb] = parseHex(b);
    return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
}

// ----------------------------------------------------------------------
// Geometria-base (referencial do corpo: origem no centro do tronco,
// +x = cabeça, -x = cauda, +y = para baixo). Comprimento total ~ 380 u.
// ----------------------------------------------------------------------

const SHOULDER_NEAR = { x: 17, y: -12 };
const SHOULDER_FAR = { x: 15, y: -20 };
const HEAD = { x: 82, y: -10 };
const TAIL_ROOT = { x: -64, y: 1 };

// ----------------------------------------------------------------------
// Pena individual
// ----------------------------------------------------------------------

/**
 * Perfil de largura de uma pena (0..1) ao longo do comprimento (t = 0..1).
 * Base estreita (escondida sob as coberteiras), corpo quase paralelo e ponta
 * arredondada/elíptica controlada por `r` (quanto maior, mais pontuda).
 */
function featherProfile(t: number, r: number): number {
    const tp = 1 - r;
    if (t < tp) {
        const k = t / tp;
        return 0.55 + 0.45 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5);
    }
    const k = (t - tp) / r;
    return Math.pow(Math.max(0, 1 - k * k), 0.55);
}

interface FeatherOpts {
    /** Lado da asa (1 = asa próxima / baixa, -1 = asa distante / alta): define qual vane é o estreito. */
    side: 1 | -1;
    /** Deslocamento lateral da ponta, como fração do comprimento (eixo y local). */
    bend?: number;
    /** Fração final do comprimento ocupada pelo arredondamento da ponta. */
    tipRound?: number;
    /** Assimetria dos vanes (0 = simétrica). */
    asym?: number;
    /** Cor do eixo (ráquis). Sem valor = sem eixo. */
    shaft?: string;
    edge?: string;
}

/** Desenha UMA pena com origem em (x, y), direção `ang` (rad), gradiente base -> ponta. */
function drawFeather(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    ang: number,
    len: number,
    width: number,
    base: string,
    tip: string,
    o: FeatherOpts
) {
    const N = 12;
    const tipR = o.tipRound ?? 0.3;
    const asym = o.asym ?? 0.2;
    const bend = o.bend ?? 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const hw = featherProfile(t, tipR) * width * 0.5;
        const px = t * len;
        const py = bend * len * t * t - hw * (1 - o.side * asym);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    for (let i = N - 1; i >= 0; i--) {
        const t = i / N;
        const hw = featherProfile(t, tipR) * width * 0.5;
        ctx.lineTo(t * len, bend * len * t * t + hw * (1 + o.side * asym));
    }
    ctx.closePath();

    const g = ctx.createLinearGradient(0, 0, len, bend * len);
    g.addColorStop(0, base);
    g.addColorStop(1, tip);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.lineWidth = 0.7;
    ctx.strokeStyle = o.edge ?? "rgba(4,12,30,0.36)";
    ctx.stroke();

    if (o.shaft) {
        ctx.beginPath();
        ctx.moveTo(len * 0.04, 0);
        ctx.quadraticCurveTo(len * 0.5, bend * len * 0.25, len * 0.93, bend * len * 0.87);
        ctx.strokeStyle = o.shaft;
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }
    ctx.restore();
}

// ----------------------------------------------------------------------
//Asa
// ----------------------------------------------------------------------
interface WingPalette {

    lesser: [string, string];
    median: [string, string];
    greater: [string, string];
    secondary: [string, string];
    primary: [string, string];
    tertial: [string, string];
    shoulder: [string, string];
    shaft: string;
}

/** Dorso da asa (asa próxima): turquesa nas coberteiras -> azul-real -> marinho nas pontas. */
const WING_TOP: WingPalette = {
    lesser: ["#54d0e6", "#2aa9d8"],
    median: ["#33bfe0", "#1f93d0"],
    greater: ["#22a3d8", "#1a76c4"],
    secondary: ["#2384d2", "#14449a"],
    primary: ["#2a6ccc", "#0e2a72"],
    tertial: ["#2ab0dc", "#1d70c0"],
    shoulder: ["#8fd06a", "#2bb3c6"],
    shaft: "rgba(2,10,34,0.30)",
};

/** Face inferior da asa (asa distante): coberteiras douradas, penas de voo oliva -> quase pretas. */
const WING_UNDER: WingPalette = {
    lesser: ["#f6cc44", "#e2a91f"],
    median: ["#eebb30", "#cf9820"],
    greater: ["#d8a428", "#b08420"],
    secondary: ["#9a7f24", "#2b3020"],
    primary: ["#7d7422", "#111c26"],
    tertial: ["#d0a02a", "#9a7a1e"],
    shoulder: ["#f8d24a", "#e0a81e"],
    shaft: "rgba(20,14,0,0.35)",
};

const PRIMARY_LEN = [66, 76, 86, 95, 102, 108, 112, 113, 106, 92];
const PRIMARY_W = [15, 15, 15, 15, 14.5, 14, 13.5, 13, 12, 10.5];

/**
 * Asa completa como cadeia de 3 segmentos (braço, antebraço, mão) com penas
 * individuais em camadas.
 *
 * @param f     -1 (baixo) .. +1 (alto)
 * @param vel   derivada de f na fase (cos(fase)): > 0 = subida (asa dobra e as
 *              primárias se fecham); < 0 = descida (asa estendida e aberta).
 * @param side  1 = asa próxima/baixa (dorso visível), -1 = asa distante/alta
 *              (face inferior visível)
 */
function drawWing(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    f: number,
    vel: number,
    side: 1 | -1,
    pal: WingPalette,
    size: number,
    shoulderPatch: boolean
) {
    const s = side;
    const up = Math.max(0, vel);

    // Ângulos: 0 = +x (frente), 90 = baixo, 180 = trás, 270 = cima.
    // Asa baixa ~102 graus, asa alta ~252 graus; `f` as move juntas e cada
    // junta "atrasa" em relação à anterior na direção oposta ao movimento.
    const th0 = (s === 1 ? 106 : 252) + f * 22;
    const a1 = (th0 - s * 12 - vel * 4) * DEG; // braço (úmero): levemente à frente
    const a2 = (th0 - vel * 8) * DEG; // antebraço
    const a3 = (th0 + s * 4 - vel * 15) * DEG; // mão: varre um pouco para trás e atrasa mais

    const La = 34 * size;
    const Lf = 48 * size;
    const Lh = 36 * size;
    const ex = sx + Math.cos(a1) * La;
    const ey = sy + Math.sin(a1) * La;
    const wx = ex + Math.cos(a2) * Lf;
    const wy = ey + Math.sin(a2) * Lf;
    const hx = wx + Math.cos(a3) * Lh;
    const hy = wy + Math.sin(a3) * Lh;

    const spread = 1 - 0.28 * up; // leque das primárias fecha na subida
    const lm = size * (1 - 0.08 * up); // asa encurta levemente ao dobrar
    const bendF = -s * (0.05 + 0.03 * up); // pontas curvam para o bordo de ataque
    const perp = s * (Math.PI / 2);
    const shaft = pal.shaft;

    // Ponto/direção ao longo do bordo de ataque: u em [0,1) braço, [1,2) antebraço, [2,3] mão.
    const seg = (u: number) => {
        if (u < 1) return { x: lerp(sx, ex, u), y: lerp(sy, ey, u), a: a1 };
        if (u < 2) return { x: lerp(ex, wx, u - 1), y: lerp(ey, wy, u - 1), a: a2 };
        const t = clamp(u - 2, 0, 1);
        return { x: lerp(wx, hx, t), y: lerp(wy, hy, t), a: a3 };
    };
    const dirAt = (u: number) => {
        const p = seg(u);
        const off = u < 1 ? 84 : u < 2 ? lerp(82, 76, u - 1) : (4 + 72 * Math.pow(1 - clamp(u - 2, 0, 1), 1.1)) * spread;
        return p.a + s * off * DEG;
    };

    // ---- Penas de voo ------------------------------------------------
    // Terciárias (junto ao corpo)
    for (let i = 0; i < 3; i++) {
        const p = seg(0.25 + i * 0.3);
        drawFeather(ctx, p.x, p.y, a1 + s * 84 * DEG, (50 - i * 5) * lm, 20 * size, pal.tertial[0], pal.tertial[1], {
            side: s,
            bend: bendF * 0.5,
            tipRound: 0.34,
            asym: 0.12,
            shaft,
        });
    }

    // Secundárias (9), do cotovelo ao punho
    for (let i = 0; i < 9; i++) {
        const k = i / 8;
        const p = seg(1 + (i + 0.5) / 9);
        drawFeather(
            ctx,
            p.x,
            p.y,
            a2 + s * lerp(82, 76, k) * DEG,
            lerp(54, 72, k) * lm,
            19 * size,
            mixHex(pal.secondary[0], pal.greater[0], 0.45 * (1 - k)),
            pal.secondary[1],
            { side: s, bend: bendF * 0.6, tipRound: 0.2, asym: 0.15, shaft }
        );
    }

    // Primárias (10): pontas se separam como "dedos"; a mais externa vai por último.
    for (let j = 0; j < 10; j++) {
        const t = j / 9;
        const p = seg(2 + t);
        const outer = t;
        drawFeather(
            ctx,
            p.x,
            p.y,
            dirAt(2 + t),
            PRIMARY_LEN[j] * lm,
            PRIMARY_W[j] * size,
            mixHex(pal.primary[0], pal.secondary[0], 0.35 * (1 - t)),
            pal.primary[1],
            { side: s, bend: bendF * (0.8 + outer * 0.9), tipRound: lerp(0.3, 0.46, outer), asym: lerp(0.15, 0.36, outer), shaft }
        );
    }

    // ---- Coberteiras (cobrem a base das penas de voo) -----------------
    // Base contínua sob as coberteiras: evita "furos" entre as penas e dá uma
    // superfície lisa em vez de um mosaico de escamas.
    {
        const lead = 12 * size;
        ctx.beginPath();
        const K = 14;
        for (let i = 0; i <= K; i++) {
            const u = 0.5 + (i / K) * 2.48;
            const p = seg(u);
            const x = p.x + Math.cos(p.a - perp) * lead;
            const y = p.y + Math.sin(p.a - perp) * lead;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        for (let i = K; i >= 0; i--) {
            const u = 0.5 + (i / K) * 2.48;
            const p = seg(u);
            const reach = (u < 1 ? 16 : u < 2 ? 30 : 12 + 30 * (1 - clamp(u - 2, 0, 1) * 0.6)) * lm;
            const a = dirAt(u);
            ctx.lineTo(p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach);
        }
        ctx.closePath();
        const ug = ctx.createLinearGradient(sx, sy, hx, hy);
        ug.addColorStop(0, pal.median[0]);
        ug.addColorStop(1, pal.greater[1]);
        ctx.fillStyle = ug;
        ctx.fill();
    }
    const softEdge = "rgba(4,12,30,0.10)";
    // Maiores: uma por secundária e uma por primária
    for (let i = 0; i < 9; i++) {
        const k = i / 8;
        const u = 1 + (i + 0.5) / 9;
        const p = seg(u);
        drawFeather(ctx, p.x, p.y, dirAt(u), 38 * lm, 18 * size, mixHex(pal.greater[0], pal.greater[1], 0.5 * k), pal.greater[1], {
            side: s,
            bend: bendF * 0.4,
            tipRound: 0.4,
            asym: 0.1,
            edge: softEdge,
        });
    }
    for (let j = 0; j < 10; j++) {
        const t = j / 9;
        const p = seg(2 + t);
        drawFeather(ctx, p.x, p.y, dirAt(2 + t), PRIMARY_LEN[j] * 0.42 * lm, 15 * size, mixHex(pal.greater[0], pal.greater[1], 0.4 + 0.5 * t), pal.greater[1], {
            side: s,
            bend: bendF * 0.4,
            tipRound: 0.42,
            asym: 0.1,
            edge: softEdge,
        });
    }

    // Médias e menores: fileiras curtas em direção ao bordo de ataque
    const coverRow = (n: number, u0: number, u1: number, shift: number, len: number, w: number, pair: [string, string]) => {
        for (let i = 0; i < n; i++) {
            const k = i / (n - 1);
            const u = lerp(u0, u1, k);
            const p = seg(u);
            const lx = Math.cos(p.a - perp) * shift * size;
            const ly = Math.sin(p.a - perp) * shift * size;
            drawFeather(ctx, p.x + lx, p.y + ly, dirAt(u), len * lm, w * size, mixHex(pair[0], pair[1], 0.55 * k), pair[1], {
                side: s,
                bend: bendF * 0.3,
                tipRound: 0.5,
                asym: 0.05,
                edge: softEdge,
            });
        }
    };
    coverRow(16, 0.9, 2.95, 8, 30, 13, pal.median);
    coverRow(16, 0.15, 2.9, 15, 22, 11, pal.lesser);

    // Alula (penas pequenas no punho)
    for (let i = 0; i < 2; i++) {
        const lx = Math.cos(a3 - perp) * 7 * size;
        const ly = Math.sin(a3 - perp) * 7 * size;
        drawFeather(ctx, wx + lx, wy + ly, a3 - s * (6 + i * 7) * DEG, (20 - i * 5) * lm, 6 * size, pal.greater[0], mixHex(pal.greater[1], pal.primary[0], 0.5), {
            side: s,
            tipRound: 0.5,
            asym: 0.1,
            edge: softEdge,
        });
    }

    // Escapulares verde-limão -> turquesa sobre a raiz da asa (só na asa próxima)
    if (shoulderPatch) {
        for (let i = 0; i < 7; i++) {
            const ang = (170 + (i - 3) * 9) * DEG;
            drawFeather(ctx, sx + 2, sy - 3 + (i - 3) * 2.2, ang, (36 - Math.abs(i - 3) * 3.5) * size, 13 * size, pal.shoulder[0], pal.shoulder[1], {
                side: s,
                tipRound: 0.4,
                asym: 0.05,
                edge: softEdge,
            });
        }
    }
}

// ----------------------------------------------------------------------
// Cauda
// ----------------------------------------------------------------------

/**
 * Cauda longa, estreita e graduada: 7 penas quase paralelas que convergem
 * para uma ponta fina (a central é a mais longa). A ondulação viaja da raiz
 * para a ponta acompanhando a fase do batimento.
 */
function drawTail(ctx: CanvasRenderingContext2D, rx: number, ry: number, phase: number, gliding: boolean) {
    const L = 190;
    const lens = [0.8, 0.89, 0.96, 1.0, 0.96, 0.89, 0.8];
    const offs = [-7.6, -5.1, -2.5, 0, 2.5, 5.1, 7.6];
    const order = [0, 6, 1, 5, 2, 4, 3]; // externas primeiro, central por cima
    const droop = 10;
    const waveAmp = gliding ? 2.5 : 7;
    const ph = gliding ? 0 : phase;
    const W0 = 4.9;

    const spine = (t: number) => ({
        x: -L * t,
        y: droop * t * t + waveAmp * Math.sin(ph - 3.2 * t) * Math.pow(t, 1.5),
    });

    ctx.save();
    ctx.translate(rx, ry);

    for (const k of order) {
        const M = 26;
        const top: [number, number][] = [];
        const bot: [number, number][] = [];
        for (let i = 0; i <= M; i++) {
            const u = i / M;
            const t = u * lens[k];
            const c = spine(t);
            const c2 = spine(t + 0.01);
            const dx = c2.x - c.x;
            const dy = c2.y - c.y;
            const l = Math.hypot(dx, dy) || 1;
            const nx = dy / l;
            const ny = -dx / l;
            const conv = 1 - 0.78 * Math.pow(t, 0.9);
            const off = offs[k] * conv;
            const hw = W0 * featherProfile(u, 0.14) * (1 - 0.35 * u);
            top.push([c.x + nx * (off - hw), c.y + ny * (off - hw)]);
            bot.push([c.x + nx * (off + hw), c.y + ny * (off + hw)]);
        }

        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i <= M; i++) ctx.lineTo(top[i][0], top[i][1]);
        for (let i = M; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
        ctx.closePath();

        // Face superior azul; as penas de baixo revelam a face inferior dourado-oliva.
        const w = k > 3 ? ((k - 3) / 3) * 0.85 : 0;
        const g = ctx.createLinearGradient(0, 0, -L, 0);
        g.addColorStop(0, mixHex("#35b7e3", "#d9b53c", w));
        g.addColorStop(0.5, mixHex("#1f86cf", "#a8912e", w));
        g.addColorStop(1, mixHex("#173f93", "#4d5a2e", w));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = "rgba(3,10,26,0.32)";
        ctx.stroke();

        // Ráquis
        ctx.beginPath();
        for (let i = 1; i <= M - 2; i++) {
            const u = i / M;
            const c = spine(u * lens[k]);
            const conv = 1 - 0.78 * Math.pow(u * lens[k], 0.9);
            const c2 = spine(u * lens[k] + 0.01);
            const l = Math.hypot(c2.x - c.x, c2.y - c.y) || 1;
            const px = c.x + ((c2.y - c.y) / l) * offs[k] * conv;
            const py = c.y + (-(c2.x - c.x) / l) * offs[k] * conv;
            if (i === 1) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(3,12,32,0.26)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Brilho na borda superior das penas de cima
        if (k >= 1 && k <= 3) {
            ctx.beginPath();
            for (let i = 2; i <= M - 4; i++) {
                if (i === 2) ctx.moveTo(top[i][0], top[i][1] + 0.9);
                else ctx.lineTo(top[i][0], top[i][1] + 0.9);
            }
            ctx.strokeStyle = "rgba(255,255,255,0.16)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }
    ctx.restore();
}

// ----------------------------------------------------------------------
// Pernas / patas (recolhidas sob o ventre, cinza-escuro com garras pretas)
// ----------------------------------------------------------------------

function drawLegs(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const foot = (ox: number, oy: number, tarsus: string, toe: string) => {
        ctx.strokeStyle = tarsus;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-28 + ox, 16 + oy);
        ctx.lineTo(-38 + ox, 31 + oy);
        ctx.stroke();

        const toes: [number, number][] = [
            [-56, 36],
            [-52, 43],
            [-42, 44],
            [-32, 39],
        ];
        ctx.strokeStyle = toe;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        for (const [tx, ty] of toes) {
            ctx.moveTo(-38 + ox, 31 + oy);
            ctx.lineTo(tx + ox, ty + oy);
        }
        ctx.stroke();

        ctx.strokeStyle = "#171a1f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [tx, ty] of toes) {
            const dx = tx + 38;
            const dy = ty - 31;
            const l = Math.hypot(dx, dy);
            ctx.moveTo(tx + ox, ty + oy);
            ctx.lineTo(tx + ox + (dx / l) * 4, ty + oy + (dy / l) * 4);
        }
        ctx.stroke();
    };

    foot(8, -3, "#454c56", "#3b414a"); // pata do lado distante
    foot(0, 0, "#5b626d", "#565d68"); // pata próxima
    ctx.restore();
}

// ----------------------------------------------------------------------
// Corpo
// ----------------------------------------------------------------------

/** Silhueta alongada (torpedo): pescoço + peito cheio, afinando até a base da cauda. */
function bodyPath(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(64, -22); // nuca
    ctx.bezierCurveTo(46, -27, 22, -27, 0, -24); // dorso
    ctx.bezierCurveTo(-22, -21, -46, -16, -70, -9); // garupa até a base da cauda
    ctx.lineTo(-68, 10);
    ctx.bezierCurveTo(-50, 15, -26, 23, -2, 25); // ventre
    ctx.bezierCurveTo(24, 28, 52, 27, 72, 16); // peito
    ctx.bezierCurveTo(80, 11, 88, 5, 90, -2); // garganta
    ctx.bezierCurveTo(86, -10, 76, -17, 64, -22);
    ctx.closePath();
}

/** Adiciona ao caminho atual uma borda com pequenos arcos (penas sobrepostas). */
function scallopedEdge(ctx: CanvasRenderingContext2D, pts: [number, number][], step: number, depth: number) {
    const dense: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
        for (let k = 0; k < n; k++) dense.push([lerp(ax, bx, k / n), lerp(ay, by, k / n)]);
    }
    dense.push(pts[pts.length - 1]);
    for (let i = 0; i < dense.length - 1; i++) {
        const [ax, ay] = dense[i];
        const [bx, by] = dense[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const l = Math.hypot(dx, dy) || 1;
        ctx.quadraticCurveTo((ax + bx) / 2 + (dy / l) * depth * 2, (ay + by) / 2 + (-dx / l) * depth * 2, bx, by);
    }
}

function drawBody(ctx: CanvasRenderingContext2D) {
    ctx.save();
    bodyPath(ctx);

    // Base dourado -> laranja
    const base = ctx.createLinearGradient(0, -26, 0, 27);
    base.addColorStop(0, "#ffd84a");
    base.addColorStop(0.4, "#ffbb22");
    base.addColorStop(0.75, "#f9990b");
    base.addColorStop(1, "#e27c08");
    ctx.fillStyle = base;
    ctx.fill();
    ctx.clip();

    // Luz no peito
    const hl = ctx.createRadialGradient(56, 4, 2, 56, 4, 34);
    hl.addColorStop(0, "rgba(255,243,150,0.55)");
    hl.addColorStop(1, "rgba(255,243,150,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(10, -30, 90, 62);

    // Sombra no ventre
    const sh = ctx.createLinearGradient(0, 4, 0, 27);
    sh.addColorStop(0, "rgba(150,60,0,0)");
    sh.addColorStop(1, "rgba(150,60,0,0.24)");
    ctx.fillStyle = sh;
    ctx.fillRect(-72, 4, 168, 26);

    // Escamas de pena no peito e no ventre
    ctx.strokeStyle = "rgba(196,92,0,0.2)";
    ctx.lineWidth = 0.9;
    for (let r = 0; r < 4; r++) {
        for (let x = 74 - (r % 2) * 4; x > -46; x -= 8) {
            ctx.beginPath();
            ctx.arc(x, r * 7 - 1, 4.2, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }
    }

    // Manto azul-turquesa (dorso, nuca, garupa e sub-caudais) com borda escamada
    const mantle: [number, number][] = [
        [92, -16],
        [58, -12],
        [36, -8],
        [12, -5],
        [-14, -2],
        [-38, 3],
        [-54, 11],
        [-66, 24],
    ];
    ctx.beginPath();
    ctx.moveTo(96, -40);
    ctx.lineTo(mantle[0][0], mantle[0][1]);
    scallopedEdge(ctx, mantle, 7.5, 3);
    ctx.lineTo(-92, 26);
    ctx.lineTo(-92, -40);
    ctx.closePath();
    const mg = ctx.createLinearGradient(90, 0, -80, 0);
    mg.addColorStop(0, "#28b8c8");
    mg.addColorStop(0.2, "#2aa6dc");
    mg.addColorStop(0.6, "#2b8ed6");
    mg.addColorStop(1, "#35b6e6");
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = "rgba(6,50,110,0.28)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Marcas de pena no manto
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 0.8;
    for (let r = 0; r < 2; r++) {
        for (let x = 60 - r * 4; x > -50; x -= 9) {
            ctx.beginPath();
            ctx.arc(x, -19 + r * 7 + (x < -20 ? (-20 - x) * 0.12 : 0), 4.4, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }
    }
    ctx.restore();

    // Tectrizes caudais: penas estreitas e quase paralelas à cauda, nascendo
    // dentro do corpo e cobrindo a base das retrizes (transição suave, sem "abas").
    const coverStyle: FeatherOpts = { side: 1, tipRound: 0.45, asym: 0.05, shaft: "rgba(2,20,60,0.2)", edge: "rgba(4,12,30,0.18)" };
    for (let i = 0; i < 3; i++) {
        drawFeather(ctx, -30 - i * 9, 6 + i * 1.6, (179 - i * 0.6) * DEG, 62 - i * 4, 9, "#2f9fd8", "#1f6fbf", coverStyle);
    }
    for (let i = 0; i < 4; i++) {
        drawFeather(ctx, -26 - i * 9, -9 + i * 2.2, (181 + i * 1.2) * DEG, 76 - i * 6, 9.5, "#3ab9e6", "#1f86cf", coverStyle);
    }
}

// ----------------------------------------------------------------------
// Cabeça
// ----------------------------------------------------------------------

/**
 * Cabeça e rosto: testa verde -> nuca turquesa, máscara branca com linhas
 * pontilhadas de penugem preta, babador preto, íris amarela, cere e bico preto
 * fortemente curvo (a ponta da maxila passa por baixo da mandíbula).
 */
function drawHead(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(HEAD.x, HEAD.y);
    ctx.rotate(0.12); // cabeça levemente inclinada para baixo

    // Crânio / laterais amarelo-alaranjadas
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb51f";
    ctx.fill();

    // Coroa: verde na testa -> turquesa na nuca
    ctx.beginPath();
    ctx.moveTo(17, -9);
    ctx.bezierCurveTo(14, -18, 4, -20.5, -6, -19);
    ctx.bezierCurveTo(-15, -17.5, -20, -10, -19.5, -3);
    ctx.bezierCurveTo(-13, -8, -4, -9, 3, -10.5);
    ctx.bezierCurveTo(8, -11, 13, -10.5, 17, -9);
    ctx.closePath();
    const crown = ctx.createLinearGradient(17, -10, -19, -6);
    crown.addColorStop(0, "#8bc53f");
    crown.addColorStop(0.5, "#3f9c5a");
    crown.addColorStop(1, "#22a7b8");
    ctx.fillStyle = crown;
    ctx.fill();

    // Babador / garganta preta (contorna a pele nua)
    ctx.beginPath();
    ctx.moveTo(18, 8);
    ctx.bezierCurveTo(14, 14, 6, 17, -3, 15.5);
    ctx.bezierCurveTo(-8, 14, -11, 10, -10, 6);
    ctx.bezierCurveTo(-6, 9.5, -3, 11, 0, 11.5);
    ctx.bezierCurveTo(7, 12.5, 13, 11, 18, 8);
    ctx.closePath();
    ctx.fillStyle = "#0e1116";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.bezierCurveTo(16, 20, 6, 22, -2, 17);
    ctx.bezierCurveTo(4, 16, 12, 14, 20, 10);
    ctx.closePath();
    ctx.fill();

    // Máscara facial branca (pele nua)
    ctx.beginPath();
    ctx.moveTo(17, -8);
    ctx.bezierCurveTo(14, -14, 5, -13, -1, -9);
    ctx.bezierCurveTo(-6, -5, -6, 3, -3, 8);
    ctx.bezierCurveTo(0, 12, 8, 13, 13, 11);
    ctx.bezierCurveTo(16, 10, 18, 8, 18, 4);
    ctx.bezierCurveTo(19, 0, 19, -4, 17, -8);
    ctx.closePath();
    const mask = ctx.createRadialGradient(6, -2, 1, 6, 0, 17);
    mask.addColorStop(0, "#fbf8f1");
    mask.addColorStop(0.7, "#f1ebe0");
    mask.addColorStop(1, "#ddd5c8");
    ctx.fillStyle = mask;
    ctx.fill();
    ctx.strokeStyle = "rgba(60,50,40,0.25)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Linhas pontilhadas de penugem preta ("costuradas") ao redor do olho
    ctx.save();
    ctx.setLineDash([1.6, 1.3]);
    ctx.strokeStyle = "#1a1d24";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(15, 1);
    ctx.quadraticCurveTo(6, 2.5, -2, -1);
    ctx.moveTo(14, 4.5);
    ctx.quadraticCurveTo(5, 7, -3, 3);
    ctx.moveTo(12.5, 8);
    ctx.quadraticCurveTo(4, 10.5, -4, 7);
    ctx.moveTo(14, -6);
    ctx.quadraticCurveTo(8, -9, 2, -8.5);
    ctx.stroke();
    ctx.restore();

    // Olho: pele clara ao redor, íris amarela, pupila preta e reflexo
    ctx.beginPath();
    ctx.arc(5, -3.5, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = "#efe6d2";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, -3.5, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = "#f2d770";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5.2, -3.5, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0d10";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -4.4, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Bico: escala 0.92 ancorada na base para não dominar o rosto
    ctx.save();
    ctx.translate(14, 0);
    ctx.scale(0.92, 0.92);
    ctx.translate(-14, 0);

    // Mandíbula (por baixo da maxila)
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.bezierCurveTo(20, 5, 26, 7, 28, 11);
    ctx.bezierCurveTo(28.5, 14.5, 26, 17, 22, 17);
    ctx.bezierCurveTo(17, 17, 13, 14, 11, 9);
    ctx.closePath();
    const lower = ctx.createLinearGradient(14, 4, 24, 17);
    lower.addColorStop(0, "#2a2e34");
    lower.addColorStop(1, "#14171b");
    ctx.fillStyle = lower;
    ctx.fill();

    // Maxila: culmen arqueado e ponta em gancho descendo além da mandíbula
    ctx.beginPath();
    ctx.moveTo(14, -12);
    ctx.bezierCurveTo(24, -14, 36, -8, 38, 5);
    ctx.bezierCurveTo(39.5, 12, 37, 20, 31, 22);
    ctx.bezierCurveTo(32, 15, 30, 10, 26, 8);
    ctx.bezierCurveTo(22, 6.5, 17, 6, 13, 6.5);
    ctx.bezierCurveTo(12, 0, 12, -6, 14, -12);
    ctx.closePath();
    const upper = ctx.createLinearGradient(14, -14, 38, 22);
    upper.addColorStop(0, "#4a5058");
    upper.addColorStop(0.5, "#15181c");
    upper.addColorStop(1, "#07080a");
    ctx.fillStyle = upper;
    ctx.fill();

    // Brilho do culmen
    ctx.beginPath();
    ctx.moveTo(17, -11);
    ctx.bezierCurveTo(27, -12.5, 35, -7, 36.5, 3);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Cere e narina + cerdas da testa
    ctx.beginPath();
    ctx.ellipse(17, -8.5, 3.6, 2.6, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#20242a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(17.4, -8.8, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#050607";
    ctx.fill();
    ctx.strokeStyle = "#0e1116";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        ctx.moveTo(13 + i * 1.6, -11 - i * 0.2);
        ctx.lineTo(16 + i * 1.8, -14 - i * 0.6);
    }
    ctx.stroke();

    ctx.restore(); // fim da escala do bico
    ctx.restore();
}

// ----------------------------------------------------------------------
// Composição final
// ----------------------------------------------------------------------

/**
 * Desenha a Arara-Canindé (Ara ararauna) em voo, virada para +x (use
 * ctx.scale(-1, 1) por fora para espelhar, como AnimatedMacaw.render faz).
 *
 * Referencial: origem no centro do tronco; +x = cabeça, -x = cauda, +y = baixo.
 *
 * @param flap  Progresso do batimento de -1.0 (asas embaixo) a +1.0 (asas no alto)
 * @param pose  Fase do batimento e estado de planeio (para lag das juntas e ondulação da cauda)
 */
export function drawAraraCaninde(ctx: CanvasRenderingContext2D, flap: number = 0, pose: MacawPose = {}) {
    const gliding = pose.gliding ?? false;
    const f = clamp(flap, -1, 1);
    const phase = pose.phase ?? Math.asin(f);
    const vel = gliding ? 0 : Math.cos(phase);

    ctx.save();

    // 1. Asa distante (alta): mostra a face inferior, atrás do corpo
    drawWing(ctx, SHOULDER_FAR.x, SHOULDER_FAR.y, f, vel, -1, WING_UNDER, 0.8, false);

    // 2. Cauda
    drawTail(ctx, TAIL_ROOT.x, TAIL_ROOT.y, phase, gliding);

    // 3. Patas recolhidas
    drawLegs(ctx);

    // 4. Corpo (com tectrizes caudais sobre a base da cauda)
    drawBody(ctx);

    // 5. Asa próxima (baixa): dorso azul, à frente do corpo
    drawWing(ctx, SHOULDER_NEAR.x, SHOULDER_NEAR.y, f, vel, 1, WING_TOP, 0.92, true);

    // 6. Cabeça
    drawHead(ctx);

    ctx.restore();
}