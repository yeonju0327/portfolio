'use client';

import React, { useEffect, useRef } from 'react';
import '../globals.css';
import { useTransitionContext } from '../context/TransitionContext';

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { playInDetailTransition } = useTransitionContext();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('portfolio_should_restore', 'true');
    }
    // 작품 상세에 진입 완료했으므로 화면을 덮고 있던 덮개 오프너(구멍 열기) 가동
    playInDetailTransition();
  }, [playInDetailTransition]);

  return (
    <div className="works-root-layout" style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#e5e5e5' }}>
      {/* 아날로그 질감 배경 및 필터 래퍼 */}
      <div 
        style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundImage: 'url(/background-image.jpg)', 
          backgroundRepeat: 'repeat', opacity: 0.9, zIndex: -2,
          pointerEvents: 'none'
        }} 
      />
      {/* SVG 크레용 필터 & 종이 엣지 필터 (메인과 동일) */}
      <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1, pointerEvents: 'none' }}>
        <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="static-paper-edge" x="-10%" y="-10%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="paper-noise" />
          <feDisplacementMap in="SourceGraphic" in2="paper-noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      
      {children}
    </div>
  );
}
