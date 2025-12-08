import React, { useRef, useEffect } from 'react';

const InteractivePoints: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: { x: number; y: number; originX: number; originY: number }[] = [];

    // Spacing between points
    const GAP = 30;
    const MOUSE_RADIUS = 150;
    const FORCE = 0.5;

    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints();
    };

    const initPoints = () => {
      points = [];
      for (let x = 0; x < canvas.width; x += GAP) {
        for (let y = 0; y < canvas.height; y += GAP) {
          // Only add points with some randomness to look organic or strict grid
          points.push({
            x,
            y,
            originX: x,
            originY: y
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111827'; // Dark dot color

      points.forEach(point => {
        // Calculate distance to mouse
        const dx = mouse.x - point.x;
        const dy = mouse.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let targetX = point.originX;
        let targetY = point.originY;

        if (distance < MOUSE_RADIUS) {
          const angle = Math.atan2(dy, dx);
          const push = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;

          // Push away
          targetX = point.originX - Math.cos(angle) * push * 50;
          targetY = point.originY - Math.sin(angle) * push * 50;
        }

        // Ease back to position
        point.x += (targetX - point.x) * 0.1;
        point.y += (targetY - point.y) * 0.1;

        // Draw Dot
        const size = distance < MOUSE_RADIUS ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    window.addEventListener('resize', resize);
    // Bind to window to track mouse even if it leaves canvas slightly, or bind to canvas for strict bounds.
    // User asked for "center of cursor tip", offsetX/Y on canvas is most accurate relative to canvas.
    canvas.addEventListener('mousemove', handleMouseMove);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full opacity-30" />
      {/* Optional decorative background symbol fading in */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <svg className="w-[800px] h-[800px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 22H22L12 2ZM12 6L18 18H6L12 6Z" />
        </svg>
      </div>
    </div>
  );
};

export default InteractivePoints;