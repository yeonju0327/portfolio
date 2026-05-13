import { useState, useEffect, useCallback, useRef } from 'react';

export const useInfiniteCanvas = (virtualSize: number) => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isReady, setIsReady] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  // 화면 밖으로 캔버스가 벗어나지 않도록 좌표를 가두는 함수
  const clampPosition = useCallback((x: number, y: number, scale: number) => {
    if (typeof window === 'undefined') return { x, y };
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvasWidth = virtualSize * scale;
    const canvasHeight = virtualSize * scale;
    
    // 최소 스케일 보장으로 캔버스가 항상 화면보다 크거나 같으므로, 좌표 범위는 아래와 같이 고정됩니다.
    const minX = w - canvasWidth;
    const maxX = 0;
    const minY = h - canvasHeight;
    const maxY = 0;
    
    return { 
      x: Math.max(minX, Math.min(maxX, x)), 
      y: Math.max(minY, Math.min(maxY, y)) 
    };
  }, [virtualSize]);

  // 초기 렌더링 세팅
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // 캔버스 바깥이 보이지 않기 위한 최소 스케일 계산
    const minScale = Math.max(w / virtualSize, h / virtualSize);
    const initialScale = Math.max(1, minScale); // 시작 스케일은 1 이상이 되도록 보장
    
    const startX = w / 2 - (virtualSize * initialScale) / 2;
    const startY = h / 2 - (virtualSize * initialScale) / 2;
    
    const clamped = clampPosition(startX, startY, initialScale);
    setViewport({ x: clamped.x, y: clamped.y, scale: initialScale });
    setIsReady(true);
  }, [virtualSize, clampPosition]);

  // 휠(줌) 컨트롤
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setViewport(prev => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // ✨ 축소 시 캔버스 바깥 영역이 보이지 않도록 동적 최소 스케일 계산
      const minScale = Math.max(w / virtualSize, h / virtualSize);
      const maxScale = 3.5; // 최대 확대 제한 (원하시는 경우 이 수치를 조절하세요)

      const scaleBy = 1.05;
      const direction = e.deltaY > 0 ? -1 : 1;
      let newScale = direction > 0 ? prev.scale * scaleBy : prev.scale / scaleBy;

      // 계산된 minScale과 maxScale 안으로 스케일 강제 고정
      newScale = Math.max(minScale, Math.min(maxScale, newScale));
      
      // 스케일 한계치에 도달해 변화가 없으면 위치 계산도 생략
      if (newScale === prev.scale) return prev;

      // 마우스 포인터 기준으로 줌 인/아웃 되도록 오프셋 계산
      const mousePointTo = { 
        x: (e.clientX - prev.x) / prev.scale, 
        y: (e.clientY - prev.y) / prev.scale 
      };
      
      const targetX = e.clientX - mousePointTo.x * newScale;
      const targetY = e.clientY - mousePointTo.y * newScale;

      // 줌을 하는 와중에도 캔버스 바깥으로 나가지 않도록 좌표 클램핑
      const clamped = clampPosition(targetX, targetY, newScale);
      
      return { x: clamped.x, y: clamped.y, scale: newScale };
    });
  }, [clampPosition, virtualSize]);

  // 마우스 클릭(드래그 시작)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // 마우스 이동 및 드래그 종료 이벤트 바인딩
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      const moveDist = Math.sqrt(
        Math.pow(e.clientX - startPos.current.x, 2) + Math.pow(e.clientY - startPos.current.y, 2)
      );
      
      // 미세한 떨림은 클릭으로 간주하고, 5px 이상 이동 시 드래그 상태로 전환
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
        setTimeout(() => setIsDraggingActive(false), 50); // 드래그 후 클릭 이벤트 방어
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

  return { viewport, isReady, isDraggingActive, handleMouseDown };
};