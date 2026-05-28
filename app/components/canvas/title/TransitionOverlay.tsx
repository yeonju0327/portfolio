'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useTransitionContext } from '../../../context/TransitionContext';
import { usePathname } from 'next/navigation';

export const TransitionOverlay: React.FC = () => {
  const { isTransitioning, type, color, imgUrl, radius, imageRadius, centerPos, resetTransition, isBackTransition } = useTransitionContext();
  const pathname = usePathname();
  
  // 마스크와 테두리 요소의 참조
  const borderCircleRef = useRef<SVGCircleElement>(null);
  const maskOuterCircleRef = useRef<SVGCircleElement>(null);
  const maskInnerCircleRef = useRef<SVGCircleElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const cx = centerPos?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const cy = centerPos?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  // 컨텍스트로부터 현재 확대된 노드의 정확한 스크린 반지름(테두리/이미지) 상속받음
  const initialRadius = radius ?? 80;
  const initialImageRadius = imageRadius ?? 75; // 원본 스펙: size - 5 스케일

  // 원본 노드 Ring의 실제 안쪽 반지름 역산 (size - 15 스케일)
  // 5px 오프셋 갭(initialRadius - initialImageRadius)의 3배가 15px 갭이 됩니다.
  const initialInnerRadius = initialRadius - (initialRadius - initialImageRadius) * 3;

  // 화면의 네 귀퉁이 중 가장 먼 곳까지의 거리를 계산하여 완벽히 덮을 수 있는 반지름 도출
  const maxDist = typeof window !== 'undefined' ? Math.max(
    Math.hypot(cx, cy),
    Math.hypot(window.innerWidth - cx, cy),
    Math.hypot(cx, window.innerHeight - cy),
    Math.hypot(window.innerWidth - cx, window.innerHeight - cy)
  ) : 1000;

  const maxRadius = maxDist * 1.25;

  // 복귀 후 첫 렌더링 시 튐(쪼그라듬) 방지용 플래그
  const shouldRestore = typeof window !== 'undefined' ? (sessionStorage.getItem('portfolio_should_restore') === 'true') : false;
  const isMainPage = pathname === '/';
  const isReturningTransition = isMainPage && shouldRestore && (type === 'out' || type === null);
  
  // ⚠️ [임시 노드 생성/삭제 타이밍 제약]: 화면이 완전히 덮인 수축 상태(in) 혹은 상세 진입 시작(out) 시점에만 임시 노드를 활성화
  const showNode = (type === 'in') || (type === 'out' && !isBackTransition);

  // 테두리 계산값 (JSX와 GSAP 양쪽에서 동일하게 사용)
  const borderStrokeWidth = initialRadius - initialInnerRadius;
  const borderInitialR = (initialRadius + initialInnerRadius) / 2;
  const borderMaxR = maxRadius - borderStrokeWidth / 2;

  useEffect(() => {
    if (!isTransitioning || !type) return;

    const borderCircle = borderCircleRef.current;
    const maskOuter = maskOuterCircleRef.current;
    const maskInner = maskInnerCircleRef.current;
    const overlayEl = overlayRef.current;

    if (!maskOuter || !maskInner || !overlayEl) return;

    gsap.killTweensOf([borderCircle, maskOuter, maskInner, overlayEl]);

    if (type === 'out') {
      gsap.set(overlayEl, { opacity: 1 });
      
      const tl = gsap.timeline();

      if (isBackTransition) {
        // 복귀 시: 가운데 점에서부터 전체로 팽창하여 화면을 덮음
        gsap.set(maskOuter, { attr: { r: 0 } });
        gsap.set(maskInner, { attr: { r: 0 } });

        tl.to(maskOuter, {
          attr: { r: maxRadius },
          duration: 0.8,
          ease: 'power2.inOut'
        });
      } else {
        // 상세 진입 시: 노드 크기에서 테두리가 바깥을 채우도록 확장 (도넛 마스크)
        gsap.set(maskOuter, { attr: { r: initialRadius } });
        gsap.set(maskInner, { attr: { r: initialImageRadius } });
        if (borderCircle) {
          gsap.set(borderCircle, { 
            attr: { r: borderInitialR }, 
            strokeWidth: borderStrokeWidth
          });
        }

        tl.to(maskOuter, {
          attr: { r: maxRadius },
          duration: 0.8,
          ease: 'power2.inOut'
        })
        .to(borderCircle, {
          attr: { r: borderMaxR },
          duration: 0.8,
          ease: 'power2.inOut'
        }, 0)
        .to(maskInner, {
          attr: { r: 0 },
          duration: 0.35,
          ease: 'power2.in',
          delay: 0.45
        }, 0);
      }

    } else if (type === 'in-detail') {
      // 2. In-detail (상세 페이지 진입 완료 시 중앙에서부터 덮개가 걷히며 내용 노출)
      gsap.set(overlayEl, { opacity: 1 });
      gsap.set(maskOuter, { attr: { r: maxRadius } });
      gsap.set(maskInner, { attr: { r: 0 } });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(overlayEl, {
            opacity: 0,
            duration: 0.15,
            onComplete: resetTransition
          });
        }
      });

      tl.to(maskInner, {
        attr: { r: maxRadius },
        duration: 0.8,
        ease: 'power2.out'
      });

    } else if (type === 'in') {
      // 3. In-transition (지도로 복귀 시 화면 전체에서 복귀 노드 크기만큼 수축 조여듬)
      gsap.set(overlayEl, { opacity: 1 });
      gsap.set(maskOuter, { attr: { r: maxRadius } });
      gsap.set(maskInner, { attr: { r: 0 } });

      if (borderCircle) {
        gsap.set(borderCircle, { 
          attr: { r: borderMaxR }, 
          strokeWidth: borderStrokeWidth
        });
      }

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(overlayEl, {
            opacity: 0,
            duration: 0.2,
            onComplete: resetTransition
          });
        }
      });

      // 먼저 노드 이미지 구멍을 뚫어서 이미지가 드러나게 함
      tl.to(maskInner, {
        attr: { r: initialImageRadius },
        duration: 0.35,
        ease: 'power2.out'
      })
      // 그 후 외곽 단색 덮개와 테두리를 화면 밖에서부터 노드 테두리 크기만큼 수축 조여듬
      .to(maskOuter, {
        attr: { r: initialRadius },
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.15
      }, 0)
      .to(borderCircle, {
        attr: { r: borderInitialR },
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.15
      }, 0);
    }

  }, [isTransitioning, type, cx, cy, initialRadius, initialInnerRadius, initialImageRadius, maxRadius, borderStrokeWidth, borderInitialR, borderMaxR, isBackTransition, resetTransition]);

  if (!isTransitioning) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: type === 'out' ? 'auto' : 'none',
        overflow: 'hidden'
      }}
    >
      {/*
       * ✅ [핵심 수정] 모든 임시 노드 요소(이미지·테두리)를 단일 SVG 안으로 통합.
       *
       * 기존 문제: SVG <mask>는 같은 <svg> 내부 요소에만 적용됩니다.
       * 이미지(<div>)와 테두리(별도 <svg>)가 마스크 SVG 바깥에 있어
       * 마스크가 전혀 적용되지 않아 이미지·테두리가 화면 전체에 삐져나왔습니다.
       *
       * 수정 후 SVG 내부 레이어 순서 (아래→위):
       * 1. <image>     : 임시 노드 이미지 — 마스크 rect 아래에 위치, 도넛 구멍으로만 노출
       * 2. <rect>      : 단색 도넛 마스크 배경 — 이미지를 구멍 외부에서 덮음
       * 3. <circle>    : 임시 노드 테두리 — 마스크 위에서 고유하게 애니메이션
       */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          {/* 도넛 마스크: 외부 흰 원 안에 검정 원이 구멍을 만들어 내부를 뚫음 */}
          <mask id="donut-transition-mask">
            <rect width="100%" height="100%" fill="black" />
            <circle
              ref={maskOuterCircleRef}
              cx={cx}
              cy={cy}
              r={(type === 'in' || isReturningTransition) ? maxRadius : initialRadius}
              fill="white"
            />
            <circle
              ref={maskInnerCircleRef}
              cx={cx}
              cy={cy}
              r={(type === 'in' || isReturningTransition) ? 0 : initialImageRadius}
              fill="black"
            />
          </mask>

          {/* 임시 노드 이미지 원형 클리핑 (showNode 일 때만 정의) */}
          {showNode && imgUrl && (
            <clipPath id="node-image-clip">
              <circle cx={cx} cy={cy} r={initialImageRadius} />
            </clipPath>
          )}
        </defs>

        {/*
         * 레이어 1: 임시 노드 이미지 (SVG <image>)
         * — 마스크 rect보다 선언 순서상 아래에 위치하므로, 도넛 마스크의 구멍(검정 영역)에서만 노출됩니다.
         * — clipPath로 원형 클리핑하여 이미지가 항상 원 모양을 유지합니다.
         * — 구멍이 닫히면(maskInner → 0) 마스크 rect가 이미지를 완전히 덮어 자연스럽게 사라집니다.
         */}
        {showNode && imgUrl && (
          <image
            href={imgUrl}
            x={cx - initialImageRadius}
            y={cy - initialImageRadius}
            width={initialImageRadius * 2}
            height={initialImageRadius * 2}
            clipPath="url(#node-image-clip)"
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* 레이어 2: 단색 도넛 마스크 배경 — 도넛 구멍 외부를 color로 채움 */}
        <rect
          width="100%"
          height="100%"
          fill={color}
          mask="url(#donut-transition-mask)"
        />

        {/*
         * 레이어 3: 임시 노드 테두리 원 — 마스크 rect 위에서 독립적으로 애니메이션.
         * 노드의 Ring 테두리를 흉내내어, 수축/팽창 시 원본 노드와 자연스럽게 연결됩니다.
         */}
        {showNode && (
          <circle
            ref={borderCircleRef}
            cx={cx}
            cy={cy}
            r={(type === 'in' || isReturningTransition) ? borderMaxR : borderInitialR}
            fill="none"
            stroke={color}
            strokeWidth={borderStrokeWidth}
            opacity={1}
          />
        )}
      </svg>
    </div>
  );
};

export default TransitionOverlay;
