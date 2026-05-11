import { useState, useEffect, useCallback, useRef } from 'react';

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
    const minX = canvasWidth >= w ? w - canvasWidth : 0;
    const maxX = canvasWidth >= w ? 0 : w - canvasWidth;
    const minY = canvasHeight >= h ? h - canvasHeight : 0;
    const maxY = canvasHeight >= h ? 0 : h - canvasHeight;
    return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
  }, [virtualSize]);

  useEffect(() => {
    const startX = window.innerWidth / 2 - virtualSize / 2;
    const startY = window.innerHeight / 2 - virtualSize / 2;
    const clamped = clampPosition(startX, startY, 1);
    setViewport({ x: clamped.x, y: clamped.y, scale: 1 });
    setIsReady(true);
  }, [virtualSize, clampPosition]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setViewport(prev => {
      const scaleBy = 1.05;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? prev.scale * scaleBy : prev.scale / scaleBy;
      if (newScale < 0.2 || newScale > 3) return prev;
      const mousePointTo = { x: (e.clientX - prev.x) / prev.scale, y: (e.clientY - prev.y) / prev.scale };
      const clamped = clampPosition(e.clientX - mousePointTo.x * newScale, e.clientY - mousePointTo.y * newScale, newScale);
      return { x: clamped.x, y: clamped.y, scale: newScale };
    });
  }, [clampPosition]);

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
    const handleMouseUp = () => { if (isDragging.current) { isDragging.current = false; setTimeout(() => setIsDraggingActive(false), 50); document.body.style.cursor = 'default'; } };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('wheel', handleWheel); };
  }, [handleWheel, isDraggingActive, clampPosition]);

  return { viewport, isReady, isDraggingActive, handleMouseDown };
};