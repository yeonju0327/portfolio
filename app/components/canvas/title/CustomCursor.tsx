'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';

interface CustomCursorProps {
  focusedNodeId: string | null;
  isAutoExploring: boolean;
}

const CustomCursor: React.FC<CustomCursorProps> = ({ focusedNodeId, isAutoExploring }) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const isPausedRef = useRef(false);

  const [cursorState, setCursorState] = useState<'default' | 'proximate' | 'full'>('default');
  // ✨ [성능 최적화 #5] 이전 커서 상태를 기억하여 동일 상태에서의 setCursorState + gsap.to 중복 호출 방지
  const prevCursorStateRef = useRef<'default' | 'proximate' | 'full'>('default');

  // ✨ 마우스 물리 좌표를 추적하여 담아둘 Ref
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || !cursorRef.current) return;

    const xSet = gsap.quickSetter(cursorRef.current, 'x', 'px');
    const ySet = gsap.quickSetter(cursorRef.current, 'y', 'px');

    const handleMouseMove = (e: MouseEvent) => {
      // 마우스가 움직이면 즉시 좌표값을 동기화하여 0프레임 딜레이를 실현합니다.
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      xSet(e.clientX);
      ySet(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 기존 호버, 오토익스플로어, 클릭 애니메이션 로직 100% 원상 복구
  useEffect(() => {
    isPausedRef.current = isAutoExploring;
    if (isAutoExploring) {
      setCursorState('default');
      gsap.to(imageRef.current, { scale: 1, rotate: 0, opacity: 0.5, duration: 0.3, ease: 'power3.out' });
    } else {
      gsap.to(imageRef.current, { opacity: 1, duration: 0.2 });
    }
  }, [isAutoExploring]);

  const updateCursorState = useCallback((targetElement: HTMLElement | null) => {
    if (isPausedRef.current) return;

    const bodyCursor = document.body.getAttribute('data-cursor');
    
    let hasPointer = false;
    let hasProximate = false;
    
    if (targetElement) {
      hasPointer = !!(targetElement.closest('[style*="cursor: pointer"]') || targetElement.closest('[data-cursor="pointer"]'));
      hasProximate = !!(targetElement.closest('[style*="cursor: default"]') || targetElement.closest('[data-cursor="proximate"]'));
    }

    const newState: 'default' | 'proximate' | 'full' =
      (hasPointer || bodyCursor === 'pointer' || focusedNodeId) ? 'full'
      : (hasProximate || bodyCursor === 'proximate') ? 'proximate'
      : 'default';

    if (newState === prevCursorStateRef.current) return;
    prevCursorStateRef.current = newState;

    setCursorState(newState);

    if (newState === 'full') {
      gsap.to(imageRef.current, { scale: 1.1, rotate: -6, duration: 0.2, ease: 'power2.out' });
    } else if (newState === 'proximate') {
      gsap.to(imageRef.current, { scale: 1.05, rotate: -2, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.to(imageRef.current, { scale: 1, rotate: 0, duration: 0.3, ease: 'power3.out' });
    }
  }, [focusedNodeId]);

  useEffect(() => {
    const handleMouseStateChange = (e: MouseEvent) => {
      updateCursorState(e.target as HTMLElement);
    };

    window.addEventListener('mouseover', handleMouseStateChange);
    
    // focusedNodeId가 변경될 때 마우스 아래의 요소를 찾아 상태를 즉시 강제 업데이트
    const currentEl = document.elementFromPoint(mousePos.current.x, mousePos.current.y) as HTMLElement | null;
    updateCursorState(currentEl);

    return () => window.removeEventListener('mouseover', handleMouseStateChange);
  }, [focusedNodeId, updateCursorState]);

  useEffect(() => {
    const handleMouseDown = () => {
      if (isPausedRef.current) return;
      gsap.to(imageRef.current, { scale: 0.9, rotate: -10, duration: 0.1, ease: 'power1.out' });
    };
    const handleMouseUp = () => {
      if (isPausedRef.current) return;
      gsap.to(imageRef.current, { 
        scale: cursorState === 'full' ? 1.1 : 1,
        rotate: cursorState === 'full' ? -6 : 0,
        duration: 0.2, 
        ease: 'back.out(2)' 
      });
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cursorState]);

  return (
    <>
      {/* ✨ cursor: none 스타일은 globals.css로 이전 (inline style 태그 제거) */}
      
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          top: '-32px', 
          left: '0px',
          width: '32px',
          height: '32px',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform', 
          opacity: isAutoExploring ? 0.5 : 1,
        }}
      >
        <img
          ref={imageRef}
          src="/cursor.png" 
          alt="custom pen cursor"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            transformOrigin: '0% 100%',
            transition: 'opacity 0.3s',
            imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
            userSelect: 'none',
            WebkitUserDrag: 'none'
          } as React.CSSProperties}
        />
      </div>
    </>
  );
};

export default CustomCursor;