'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const isPausedRef = useRef(false);

  const [cursorState, setCursorState] = useState<'default' | 'proximate' | 'full'>('default');
  const prevCursorStateRef = useRef<'default' | 'proximate' | 'full'>('default');

  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || !cursorRef.current) return;

    const xSet = gsap.quickSetter(cursorRef.current, 'x', 'px');
    const ySet = gsap.quickSetter(cursorRef.current, 'y', 'px');

    const handleMouseMove = (e: MouseEvent) => {
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

  const updateCursorState = useCallback((targetElement: HTMLElement | null) => {
    if (isPausedRef.current) return;

    const bodyCursor = document.body.getAttribute('data-cursor');
    const focusedNode = document.body.getAttribute('data-focused-node');
    
    let hasPointer = false;
    let hasProximate = false;
    
    if (targetElement) {
      hasPointer = !!(targetElement.closest('[style*="cursor: pointer"]') || targetElement.closest('[data-cursor="pointer"]'));
      hasProximate = !!(targetElement.closest('[style*="cursor: default"]') || targetElement.closest('[data-cursor="proximate"]'));
    }

    const newState: 'default' | 'proximate' | 'full' =
      (hasPointer || bodyCursor === 'pointer' || focusedNode) ? 'full'
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
  }, []);

  // auto-exploring 및 focused-node 상태 변화 감지를 위한 MutationObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateFromDOM = () => {
      const isAuto = document.body.getAttribute('data-auto-exploring') === 'true';
      isPausedRef.current = isAuto;
      if (isAuto) {
        setCursorState('default');
        gsap.to(imageRef.current, { scale: 1, rotate: 0, opacity: 0.5, duration: 0.3, ease: 'power3.out' });
      } else {
        gsap.to(imageRef.current, { opacity: 1, duration: 0.2 });
        // auto exploring이 풀렸을 때 현재 마우스 밑의 요소 기준으로 커서 갱신
        const currentEl = document.elementFromPoint(mousePos.current.x, mousePos.current.y) as HTMLElement | null;
        updateCursorState(currentEl);
      }
    };

    updateFromDOM(); // 초기 동기화

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'data-auto-exploring') {
            updateFromDOM();
          }
          if (mutation.attributeName === 'data-focused-node') {
            const currentEl = document.elementFromPoint(mousePos.current.x, mousePos.current.y) as HTMLElement | null;
            updateCursorState(currentEl);
          }
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, [updateCursorState]);

  useEffect(() => {
    const handleMouseStateChange = (e: MouseEvent) => {
      updateCursorState(e.target as HTMLElement);
    };

    window.addEventListener('mouseover', handleMouseStateChange);

    return () => window.removeEventListener('mouseover', handleMouseStateChange);
  }, [updateCursorState]);

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
  );
};

export default CustomCursor;