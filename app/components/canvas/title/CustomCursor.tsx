'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  // ✨ 마우스 물리 좌표를 추적하여 담아둘 Ref
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || !cursorRef.current) return;

    const xSet = gsap.quickSetter(cursorRef.current, 'x', 'px');
    const ySet = gsap.quickSetter(cursorRef.current, 'y', 'px');

    const handleMouseMove = (e: MouseEvent) => {
      // 마우스가 움직이면 좌표값만 업데이트합니다.
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
    };

    // ✨ 화면 이동 중에도 사용자의 실제 물리적 마우스 좌표를 
    // 매 프레임(Tick)마다 강제로 동기화하여 시각적인 멈춤/순간이동 현상을 원천 차단합니다.
    const renderPosition = () => {
      xSet(mousePos.current.x);
      ySet(mousePos.current.y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    gsap.ticker.add(renderPosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      gsap.ticker.remove(renderPosition);
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

  useEffect(() => {
    const handleMouseStateChange = (e: MouseEvent) => {
      if (isPausedRef.current) return;

      const target = e.target as HTMLElement;
      const fullHitbox = target.closest('[style*="cursor: pointer"]');
      const proximateHitbox = target.closest('[style*="cursor: default"]');

      if (fullHitbox || focusedNodeId) {
        setCursorState('full');
        gsap.to(imageRef.current, { scale: 1.1, rotate: -6, duration: 0.2, ease: 'power2.out' });
      } else if (proximateHitbox) {
        setCursorState('proximate');
        gsap.to(imageRef.current, { scale: 1.05, rotate: -2, duration: 0.3, ease: 'power2.out' });
      } else {
        setCursorState('default');
        gsap.to(imageRef.current, { scale: 1, rotate: 0, duration: 0.3, ease: 'power3.out' });
      }
    };

    window.addEventListener('mouseover', handleMouseStateChange);
    return () => window.removeEventListener('mouseover', handleMouseStateChange);
  }, [focusedNodeId]);

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
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>
      
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