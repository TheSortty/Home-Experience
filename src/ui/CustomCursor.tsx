import React, { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  isAdmin?: boolean;
}

const CustomCursor: React.FC<CustomCursorProps> = ({ isAdmin = false }) => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [outlinePosition, setOutlinePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Skip custom cursor on mobile devices
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  useEffect(() => {
    if (isMobile) return;

    const onMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      setMousePosition({ x: clientX, y: clientY });
      if (!isVisible) setIsVisible(true);
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    const onMouseEnter = () => setIsVisible(true);
    const onMouseLeave = () => setIsVisible(false);

    // Add event listeners for hover effects on interactive elements
    const addHoverListeners = () => {
      const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
      
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => setIsHovering(true));
        el.addEventListener('mouseleave', () => setIsHovering(false));
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);
    
    // Initial check and periodic check for new elements (simple observer alternative)
    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
      observer.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isMobile, isVisible]);

  // Animation loop for smooth follower
  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      // Smooth follow logic
      const delay = 0.15; // Lower = faster follow
      
      setOutlinePosition(prev => ({
        x: prev.x + (mousePosition.x - prev.x) * delay,
        y: prev.y + (mousePosition.y - prev.y) * delay
      }));
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isMobile) return;
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mousePosition, isMobile]);

  if (isMobile) return null;

  const cursorColor = isAdmin ? 'var(--color-darkest)' : 'var(--color-accent)';

  return (
    <>
      <div 
        ref={cursorDotRef}
        className="cursor-dot"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          backgroundColor: cursorColor,
          opacity: isVisible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.8 : 1})`
        }}
      />
      <div 
        ref={cursorOutlineRef}
        className="cursor-outline"
        style={{
          left: `${outlinePosition.x}px`,
          top: `${outlinePosition.y}px`,
          borderColor: cursorColor,
          opacity: isVisible ? 1 : 0,
          width: isHovering ? '60px' : '40px',
          height: isHovering ? '60px' : '40px',
          backgroundColor: isHovering ? `${cursorColor}20` : 'transparent', // 20 is hex opacity
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.9 : 1})`,
          borderWidth: isHovering ? '2px' : '1px'
        }}
      />
    </>
  );
};

export default CustomCursor;