import React, { useEffect, useRef } from 'react';

const DynamicLines: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width: number;
        let height: number;

        const lineColors = ['#94A3B8', '#00A9CE', '#CBD5E1', '#8BD8DF'];
        const lineCount = 25;

        class Line {
            startX: number;
            startY: number;
            endX: number;
            endY: number;
            color: string;
            thickness: number;
            progress: number;
            speed: number;
            delay: number;
            opacity: number;

            constructor() {
                this.reset();
                // Randomize initial progress so they don't all start at once
                this.progress = Math.random();
            }

            reset() {
                const isHorizontal = Math.random() > 0.5;

                if (isHorizontal) {
                    this.startX = Math.random() > 0.5 ? -0.2 : 1.2;
                    this.startY = Math.random();
                    this.endX = this.startX < 0 ? 1.2 : -0.2;
                    this.endY = Math.random();
                } else {
                    this.startX = Math.random();
                    this.startY = Math.random() > 0.5 ? -0.2 : 1.2;
                    this.endX = Math.random();
                    this.endY = this.startY < 0 ? 1.2 : -0.2;
                }

                this.color = lineColors[Math.floor(Math.random() * lineColors.length)];
                this.thickness = Math.random() * 2 + 1;
                this.progress = 0;
                this.speed = 0.001 + Math.random() * 0.002; // Very slow
                this.delay = Math.random() * 100;
                this.opacity = 0;
            }

            draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
                if (this.delay > 0) {
                    this.delay--;
                    return;
                }

                this.progress += this.speed;
                if (this.progress > 1) {
                    this.reset();
                    return;
                }

                // Smooth opacity fade in/out
                if (this.progress < 0.2) this.opacity = this.progress * 5;
                else if (this.progress > 0.8) this.opacity = (1 - this.progress) * 5;
                else this.opacity = 1;

                // Radial mask effect (center-based fading)
                const currentX = this.startX + (this.endX - this.startX) * this.progress;
                const currentY = this.startY + (this.endY - this.startY) * this.progress;

                const distFromCenter = Math.sqrt(Math.pow(currentX - 0.5, 2) + Math.pow(currentY - 0.5, 2));
                const radialFade = Math.max(0, 1 - (distFromCenter / 0.5));

                const finalOpacity = this.opacity * radialFade * 0.3; // 0.3 matches the original opacity-30

                if (finalOpacity <= 0) return;

                const x1 = (this.startX + (this.endX - this.startX) * Math.max(0, this.progress - 0.2)) * w;
                const y1 = (this.startY + (this.endY - this.startY) * Math.max(0, this.progress - 0.2)) * h;
                const x2 = currentX * w;
                const y2 = currentY * h;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.thickness;
                ctx.globalAlpha = finalOpacity;
                ctx.stroke();
            }
        }

        const lines = Array.from({ length: lineCount }, () => new Line());

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            lines.forEach(line => line.draw(ctx, width, height));
            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    );
};

export default DynamicLines;
