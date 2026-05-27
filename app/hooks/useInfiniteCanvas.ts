import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';

export const useInfiniteCanvas = (virtualSize: number) => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isReady, setIsReady] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  
  // ✨ [성능 최적화 #1] viewport를 ref로 분리 → GSAP이 React 상태 객체를 직접 mutate하는 패턴 제거
  // GSAP 애니메이션은 이 ref를 조작하고, onUpdate에서만 setViewport를 호출하여 렌더링 트리거
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  
  // ✨ [성능 최적화 #2] isDraggingActive를 ref로도 관리
  // useEffect 의존성 배열에서 isDraggingActive를 제거하여 드래그 시작 시 리스너가 재등록되는 문제 해결
  const isDraggingActiveRef = useRef(false);

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

  // ✨ [성능 최적화 #2] moveCamera — viewport 의존성 완전 제거
  // viewportRef.current를 직접 읽어 stale closure 문제 해결
  // moveCamera가 viewport state 변경마다 재생성되던 문제 해결 → 이를 참조하는 handleNodeClick도 안정화
  const moveCamera = useCallback((targetX: number, targetY: number, screenPoint: {x: number, y: number}, duration = 1.2) => {
    const currentVp = viewportRef.current;
    const newX = screenPoint.x - targetX * currentVp.scale;
    const newY = screenPoint.y - targetY * currentVp.scale;
    const clamped = clampPosition(newX, newY, currentVp.scale);

    gsap.killTweensOf(viewportRef.current);
    gsap.to(viewportRef.current, {
      x: clamped.x,
      y: clamped.y,
      duration,
      ease: "power3.inOut",
      onUpdate: () => {
        setViewport({ ...viewportRef.current });
      }
    });
  }, [clampPosition]); // ✨ viewport 의존성 제거!

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minScale = Math.max(w / virtualSize, h / virtualSize);
    const initialScale = Math.max(1, minScale);
    const startX = w / 2 - (virtualSize * initialScale) / 2;
    const startY = h / 2 - (virtualSize * initialScale) / 2;
    const clamped = clampPosition(startX, startY, initialScale);
    const initial = { x: clamped.x, y: clamped.y, scale: initialScale };
    viewportRef.current = { ...initial };
    setViewport(initial);
    setIsReady(true);
  }, [virtualSize, clampPosition]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('.sidebar-container') || target.closest('.paper-dashboard-container'))) {
      return;
    }

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
      const next = { x: clamped.x, y: clamped.y, scale: newScale };
      viewportRef.current = next; // ref도 동기화
      return next;
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
      
      // ✨ [성능 최적화 #1] isDraggingActiveRef로 판정 → isDraggingActive state는 UI 표시용으로만 유지
      // 이 분기에서 isDraggingActive state를 읽지 않으므로 이 useEffect가 재실행되지 않음
      if (moveDist > 5 && !isDraggingActiveRef.current) {
        isDraggingActiveRef.current = true;
        setIsDraggingActive(true);
      }
      setViewport(prev => {
        const clamped = clampPosition(prev.x + dx, prev.y + dy, prev.scale);
        const next = { ...prev, x: clamped.x, y: clamped.y };
        viewportRef.current = next; // ref도 동기화
        return next;
      });
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { 
      if (isDragging.current) { 
        isDragging.current = false;
        isDraggingActiveRef.current = false;
        setTimeout(() => setIsDraggingActive(false), 50);
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
  // ✨ [성능 최적화 #1] isDraggingActive 의존성 제거 → 드래그 시작 시 리스너 재등록 방지
  }, [handleWheel, clampPosition]);

  return { viewport, setViewport, viewportRef, isReady, isDraggingActive, handleMouseDown, moveCamera };
};