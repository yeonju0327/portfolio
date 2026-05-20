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

  useEffect(() => {
    if (typeof window === 'undefined' || !cursorRef.current) return;

    // 마우스 추적 속도 0.02초 유지 (반응성 최우선)
    const xTo = gsap.quickTo(cursorRef.current, 'x', { duration: 0.02, ease: 'power2.out' });
    const yTo = gsap.quickTo(cursorRef.current, 'y', { duration: 0.02, ease: 'power2.out' });

    const handleMouseMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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
        gsap.to(imageRef.current, { scale: 1.03, rotate: -2, duration: 0.3, ease: 'power2.out' });
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
      gsap.to(imageRef.current, { scaleX: 1.15, scaleY: 0.9, duration: 0.1, ease: 'power1.out' });
    };
    const handleMouseUp = () => {
      if (isPausedRef.current) return;
      gsap.to(imageRef.current, { 
        scaleX: cursorState === 'full' ? 1.1 : 1, 
        scaleY: cursorState === 'full' ? 1.1 : 1, 
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
            // ✨ [수정] 96px에서 32px로 변경하여 펜촉 끝을 마우스 위치에 맞춤
            top: '-32px', 
            left: '0px',
            // ✨ [수정] 너비와 높이를 96에서 32로 축소
            width: '32px',
            height: '32px',
            pointerEvents: 'none',
            zIndex: 99999,
            willChange: 'transform',
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