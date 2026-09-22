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
        let dpr = window.devicePixelRatio || 1;

        const lineColors = ['#94A3B8', '#00A9CE', '#CBD5E1', '#8BD8DF'];
        const lineCount = 20; // Reduced for performance

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
                this.thickness = (Math.random() * 1.5 + 0.5); // Slightly thinner
                this.progress = 0;
                this.speed = 0.0005 + Math.random() * 0.001; // Slower speed
                this.delay = Math.random() * 200;
                this.opacity = 0;
            }

            draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
                if (this.delay > 0) {
                    this.delay--;
                    return;
                }

                this.progress += this.speed;
                if (this.progress > 1) {
                    this.reset();
                    return;
                }

                if (this.progress < 0.2) this.opacity = this.progress * 5;
                else if (this.progress > 0.8) this.opacity = (1 - this.progress) * 5;
                else this.opacity = 1;

                const currentX = this.startX + (this.endX - this.startX) * this.progress;
                const currentY = this.startY + (this.endY - this.startY) * this.progress;

                const distFromCenter = Math.sqrt(Math.pow(currentX - 0.5, 2) + Math.pow(currentY - 0.5, 2));
                const radialFade = Math.max(0, 1 - (distFromCenter / 0.6));

                const finalOpacity = this.opacity * radialFade * 0.25;

                if (finalOpacity <= 0) return;

                const x1 = (this.startX + (this.endX - this.startX) * Math.max(0, this.progress - 0.25)) * w;
                const y1 = (this.startY + (this.endY - this.startY) * Math.max(0, this.progress - 0.25)) * h;
                const x2 = currentX * w;
                const y2 = currentY * h;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.thickness * dpr;
                ctx.globalAlpha = finalOpacity;
                ctx.stroke();
            }
        }

        const lines = Array.from({ length: lineCount }, () => new Line());

        const handleResize = () => {
            dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(dpr, dpr);
        };

        // Throttled resize
        let resizeTimeout: any;
        const throttledResize = () => {
            if (!resizeTimeout) {
                resizeTimeout = setTimeout(() => {
                    handleResize();
                    resizeTimeout = null;
                }, 200);
            }
        };

        const render = () => {
            if (document.visibilityState === 'visible') {
                ctx.clearRect(0, 0, width, height);
                lines.forEach(line => line.draw(ctx, width, height, dpr));
            }
            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('resize', throttledResize);
        handleResize();
        render();

        return () => {
            window.removeEventListener('resize', throttledResize);
            cancelAnimationFrame(animationFrameId);
            clearTimeout(resizeTimeout);
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
