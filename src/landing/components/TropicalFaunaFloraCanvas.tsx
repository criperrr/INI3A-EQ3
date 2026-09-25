import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { SemanticTheme } from "../theme";
import { AnimatedMonsteraLeaf } from "../graphics/monsteraLeaf";
import { AnimatedMacaw } from "../graphics/macaw";

interface TropicalFaunaFloraCanvasProps {
    theme: SemanticTheme;
    style?: any;
    showMacaw?: boolean;
    showLeaves?: boolean;
}

export const TropicalFaunaFloraCanvas: React.FC<TropicalFaunaFloraCanvasProps> = ({
    theme,
    style,
    showMacaw = true,
    showLeaves = true,
}) => {
    const containerRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Instances
    const leavesRef = useRef<AnimatedMonsteraLeaf[]>([]);
    const macawRef = useRef<AnimatedMacaw | null>(null);
    const mousePosRef = useRef<{ x: number; y: number; normX: number; normY: number }>({
        x: -999,
        y: -999,
        normX: 0,
        normY: 0,
    });

    useEffect(() => {
        if (Platform.OS !== "web") return;

        const container = containerRef.current;
        if (!container) return;

        // Create or get DOM canvas
        let canvas = canvasRef.current;
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.pointerEvents = "none";
            canvas.style.zIndex = "1";
            canvasRef.current = canvas;
            container.appendChild(canvas);
        }

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        // Resize handler with High-DPI support
        const resizeCanvas = () => {
            if (!canvas || !container) return;
            const rect = container.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance

            const width = Math.max(rect.width, 320);
            const height = Math.max(rect.height, 400);

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.resetTransform?.();
            ctx.scale(dpr, dpr);

            initScene(width, height);
        };

        const initScene = (w: number, h: number) => {
            // 1. Monstera Leaves Positioning (Lush tropical framing)
            const leaves: AnimatedMonsteraLeaf[] = [];

            if (showLeaves) {
                // Top-Left Cluster (Framing header/hero)
                leaves.push(
                    new AnimatedMonsteraLeaf({
                        x: -30,
                        y: 10,
                        scale: 0.58,
                        rotation: 0.65,
                        swaySpeed: 0.7,
                        swayAmount: 0.05,
                        swayPhase: 0,
                        opacity: 0.95,
                        depth: 1.0,
                    }),
                    new AnimatedMonsteraLeaf({
                        x: 80,
                        y: -40,
                        scale: 0.44,
                        rotation: 1.25,
                        swaySpeed: 0.9,
                        swayAmount: 0.06,
                        swayPhase: 1.8,
                        opacity: 0.85,
                        depth: 0.7,
                    }),
                    new AnimatedMonsteraLeaf({
                        x: 15,
                        y: 140,
                        scale: 0.38,
                        rotation: 0.35,
                        swaySpeed: 0.65,
                        swayAmount: 0.04,
                        swayPhase: 3.2,
                        opacity: 0.75,
                        depth: 0.5,
                        flipped: true,
                    })
                );

                // Top-Right Ambient Leaf
                leaves.push(
                    new AnimatedMonsteraLeaf({
                        x: w + 20,
                        y: 20,
                        scale: 0.52,
                        rotation: -0.7,
                        swaySpeed: 0.75,
                        swayAmount: 0.05,
                        swayPhase: 2.1,
                        opacity: 0.88,
                        depth: 0.9,
                        flipped: true,
                    }),
                    new AnimatedMonsteraLeaf({
                        x: w - 80,
                        y: -30,
                        scale: 0.4,
                        rotation: -1.3,
                        swaySpeed: 0.85,
                        swayAmount: 0.04,
                        swayPhase: 0.5,
                        opacity: 0.7,
                        depth: 0.6,
                    })
                );

                // Bottom-Left subtle background leaf
                leaves.push(
                    new AnimatedMonsteraLeaf({
                        x: -20,
                        y: h - 60,
                        scale: 0.48,
                        rotation: -0.4,
                        swaySpeed: 0.6,
                        swayAmount: 0.035,
                        swayPhase: 4.0,
                        opacity: 0.65,
                        depth: 0.4,
                    })
                );

                // Right-side floating leaf near phone mockup
                leaves.push(
                    new AnimatedMonsteraLeaf({
                        x: w - 40,
                        y: h * 0.55,
                        scale: 0.36,
                        rotation: -0.85,
                        swaySpeed: 0.8,
                        swayAmount: 0.045,
                        swayPhase: 5.2,
                        opacity: 0.6,
                        depth: 0.3,
                        flipped: true,
                    })
                );
            }
            leavesRef.current = leaves;

            // 2. Animated Macaw
            if (showMacaw) {
                if (!macawRef.current) {
                    macawRef.current = new AnimatedMacaw(-100, h * 0.28, 0.42);
                }
                macawRef.current.setBounds(w, h);
            }
        };

        resizeCanvas();

        // Mouse motion listener for parallax and interactive flight
        const handleMouseMove = (e: MouseEvent) => {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const normX = (mouseX / rect.width) * 2 - 1;
            const normY = (mouseY / rect.height) * 2 - 1;

            mousePosRef.current = { x: mouseX, y: mouseY, normX, normY };
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        window.addEventListener("resize", resizeCanvas);

        // Animation Loop
        let lastTime = performance.now();

        const renderLoop = (currentTime: number) => {
            const timeDelta = Math.min((currentTime - lastTime) / 1000, 0.1);
            lastTime = currentTime;

            if (!document.hidden && canvas) {
                const rect = container.getBoundingClientRect();
                const w = rect.width;
                const h = rect.height;

                // Clear previous frame
                ctx.clearRect(0, 0, w, h);

                const timeSec = currentTime * 0.001;
                const { x: mx, y: my, normX, normY } = mousePosRef.current;

                // Render Leaves
                for (const leaf of leavesRef.current) {
                    leaf.update(timeSec, normX, normY);
                    leaf.render(ctx);
                }

                // Render & Update Macaw
                if (macawRef.current && showMacaw) {
                    macawRef.current.update(timeDelta, mx, my);
                    macawRef.current.render(ctx);
                }
            }

            animationFrameRef.current = requestAnimationFrame(renderLoop);
        };

        animationFrameRef.current = requestAnimationFrame(renderLoop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", resizeCanvas);
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            canvasRef.current = null;
        };
    }, [showMacaw, showLeaves]);

    return (
        <View
            ref={containerRef}
            style={[styles.container, style]}
            pointerEvents="none"
        />
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFill,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 2,
    },
});
