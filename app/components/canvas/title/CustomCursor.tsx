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

    // ✨ 애니메이션(easing)이 포함된 quickTo 대신, 딜레이 제로(0)인 quickSetter 사용
    const xSet = gsap.quickSetter(cursorRef.current, 'x', 'px');
    const ySet = gsap.quickSetter(cursorRef.current, 'y', 'px');

    const handleMouseMove = (e: MouseEvent) => {
      // 마우스 좌표를 프레임 단위로 즉각 꽂아 넣어 딜레이를 완벽히 없앱니다.
      xSet(e.clientX);
      ySet(e.clientY);
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
      // ✨ 좌우로 찢어지던 scaleX, scaleY 대신 전체 scale을 줄여 종이에 꾹 누르는 연출
      gsap.to(imageRef.current, { scale: 0.9, rotate: -10, duration: 0.1, ease: 'power1.out' });
    };
    const handleMouseUp = () => {
      if (isPausedRef.current) return;
      // ✨ 뗐을 때 텐션감 있게 원래 크기(full 상태면 1.1, 아니면 1)로 복귀
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
          willChange: 'transform', // GPU 가속 유지
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