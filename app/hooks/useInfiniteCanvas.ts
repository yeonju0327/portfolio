import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';

export const useInfiniteCanvas = (virtualSize: number) => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isReady, setIsReady] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  const clampPosition = useCallback((x: number, y: number, scale: number) => {
    if (typeof window === 'undefined') return { x, y };
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvasWidth = virtualSize * scale;
    const canvasHeight = virtualSize * scale;
    const minX = w - canvasWidth;
    const maxX = 0;
    const minY = h - canvasHeight;
    const maxY = 0;
    return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
  }, [virtualSize]);

  // ✨ 카메라를 특정 화면 위치로 부드럽게 이동시키는 함수
  const moveCamera = useCallback((targetX: number, targetY: number, screenPoint: {x: number, y: number}, duration = 1.2) => {
    const newX = screenPoint.x - targetX * viewport.scale;
    const newY = screenPoint.y - targetY * viewport.scale;
    const clamped = clampPosition(newX, newY, viewport.scale);

    gsap.to(viewport, {
      x: clamped.x,
      y: clamped.y,
      duration,
      ease: "power3.inOut",
      onUpdate: () => setViewport({ ...viewport })
    });
  }, [viewport, clampPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minScale = Math.max(w / virtualSize, h / virtualSize);
    const initialScale = Math.max(1, minScale);
    const startX = w / 2 - (virtualSize * initialScale) / 2;
    const startY = h / 2 - (virtualSize * initialScale) / 2;
    const clamped = clampPosition(startX, startY, initialScale);
    setViewport({ x: clamped.x, y: clamped.y, scale: initialScale });
    setIsReady(true);
  }, [virtualSize, clampPosition]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setViewport(prev => {
      const minScale = Math.max(window.innerWidth / virtualSize, window.innerHeight / virtualSize);
      const maxScale = 3.5;
      const scaleBy = 1.05;
      const direction = e.deltaY > 0 ? -1 : 1;
      let newScale = direction > 0 ? prev.scale * scaleBy : prev.scale / scaleBy;
      newScale = Math.max(minScale, Math.min(maxScale, newScale));
      if (newScale === prev.scale) return prev;
      const mousePointTo = { x: (e.clientX - prev.x) / prev.scale, y: (e.clientY - prev.y) / prev.scale };
      const targetX = e.clientX - mousePointTo.x * newScale;
      const targetY = e.clientY - mousePointTo.y * newScale;
      const clamped = clampPosition(targetX, targetY, newScale);
      return { x: clamped.x, y: clamped.y, scale: newScale };
    });
  }, [clampPosition, virtualSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const moveDist = Math.sqrt(Math.pow(e.clientX - startPos.current.x, 2) + Math.pow(e.clientY - startPos.current.y, 2));
      if (moveDist > 5 && !isDraggingActive) {
        setIsDraggingActive(true);
        document.body.style.cursor = 'grabbing';
      }
      setViewport(prev => {
        const clamped = clampPosition(prev.x + dx, prev.y + dy, prev.scale);
        return { ...prev, x: clamped.x, y: clamped.y };
      });
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { 
      if (isDragging.current) { 
        isDragging.current = false; 
        setTimeout(() => setIsDraggingActive(false), 50); 
        document.body.style.cursor = 'default'; 
      } 
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => { 
      window.removeEventListener('mousemove', handleMouseMove); 
      window.removeEventListener('mouseup', handleMouseUp); 
      window.removeEventListener('wheel', handleWheel); 
    };
  }, [handleWheel, isDraggingActive, clampPosition]);

  return { viewport, setViewport, isReady, isDraggingActive, handleMouseDown, moveCamera };
};