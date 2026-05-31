'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface LoadingOverlayProps {
  loadingProgress: number;
  /** BlackjackCanvas에서 관리하는 ref — EnvironmentLoader의 GSAP 페이드아웃 타겟으로도 사용 */
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * HDR 환경맵 로딩 중에 표시되는 아날로그-디지털 톤의 풀스크린 오버레이입니다.
 * GSAP 무한 회전 스피너와 로딩 퍼센트를 표시하며,
 * 로딩 완료 시 EnvironmentLoader가 외부 overlayRef를 통해 페이드아웃을 제어합니다.
 */
export default function LoadingOverlay({ loadingProgress, overlayRef }: LoadingOverlayProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);

  // 스피너 GSAP 무한 회전
  useEffect(() => {
    if (!spinnerRef.current) return;
    const tween = gsap.to(spinnerRef.current, {
      rotation: 360,
      duration: 1.2,
      repeat: -1,
      ease: 'none',
    });
    return () => { tween.kill(); };
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(5, 12, 22, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99,
        color: '#FFFFFF',
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* 아날로그-디지털 톤의 원형 프로그레스 로더 */}
      <div
        style={{
          position: 'relative',
          width: '90px',
          height: '90px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          ref={spinnerRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '3.5px solid rgba(255, 255, 255, 0.08)',
            borderTop: '3.5px solid #00E5FF',
            borderRight: '3.5px solid #FFC107',
            borderRadius: '50%',
          }}
        />
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#00E5FF',
            textShadow: '0 0 12px rgba(0, 229, 255, 0.6)',
          }}
        >
          {loadingProgress}%
        </span>
      </div>

      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          letterSpacing: '2.5px',
          margin: '0 0 8px 0',
          color: '#E2E8F0',
          textTransform: 'uppercase',
        }}
      >
        Calibrating the Stars
      </h2>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#718096',
          margin: 0,
          letterSpacing: '1px',
        }}
      >
        Rendering celestial spheres...{' '}
        ({Math.min(4.98, Number((4.98 * loadingProgress / 100).toFixed(2)))} MB / 4.98 MB)
      </p>
    </div>
  );
}
