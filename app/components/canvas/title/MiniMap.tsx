import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { PORTFOLIO_MAP, CENTER } from './data';

interface MiniMapProps {
  viewport: { x: number; y: number; scale: number };
  setViewport: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number }>>;
  activeIds: string[];
  links: { source: string; target: string; delay?: number }[];
  isAutoExploring: boolean;
  onAutoExplore: () => void;
}

const VIRTUAL_SIZE = 5000;
const MAP_SIZE = 240; // 미니맵 크기 대폭 확장 (180px -> 240px)

// ✨ [성능 최적화 #7] React.memo 적용 → viewport외 prop 변경 시에만 재렌더링
export const MiniMap: React.FC<MiniMapProps> = React.memo(({ viewport, setViewport, activeIds, links, isAutoExploring, onAutoExplore }) => {
  const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 });
  const mapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  // ✨ [성능 최적화 #7] isBtnHovered React state 제거 → DOM 직접 조작으로 대체

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ratio = MAP_SIZE / VIRTUAL_SIZE;

  // 뷰포트 월드 좌표 계산
  const worldX = -viewport.x / viewport.scale;
  const worldY = -viewport.y / viewport.scale;
  const worldW = windowSize.w / viewport.scale;
  const worldH = windowSize.h / viewport.scale;

  // 미니맵 좌표 계산
  const miniX = Math.max(-5, Math.min(MAP_SIZE + 5, worldX * ratio));
  const miniY = Math.max(-5, Math.min(MAP_SIZE + 5, worldY * ratio));
  const miniW = Math.max(5, Math.min(MAP_SIZE * 1.2, worldW * ratio));
  const miniH = Math.max(5, Math.min(MAP_SIZE * 1.2, worldH * ratio));

  // 카메라 뷰포트가 4000px 가상 공간을 벗어나지 않게 철저히 제약(clamp)하는 함수
  const clampViewport = useCallback((x: number, y: number, scale: number) => {
    const minX = windowSize.w - VIRTUAL_SIZE * scale;
    const maxX = 0;
    const minY = windowSize.h - VIRTUAL_SIZE * scale;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }, [windowSize]);

  // 실시간 마우스 드래그 좌표 추적 및 이동 함수
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    
    // 테두리(4px)와 패딩(8px) 제외 내부 240px 캔버스 상대 좌표
    let clickX = clientX - rect.left - 4 - 8;
    let clickY = clientY - rect.top - 4 - 8;

    // 미니맵 캔버스 영역 밖으로 마우스가 탈출해도 0~MAP_SIZE 범위로 강제 고정
    clickX = Math.max(0, Math.min(MAP_SIZE, clickX));
    clickY = Math.max(0, Math.min(MAP_SIZE, clickY));

    // 월드 좌표 역산
    const targetWorldX = clickX / ratio;
    const targetWorldY = clickY / ratio;

    // 카메라 뷰포트 계산 및 경계 조건 반영
    const targetX = windowSize.w / 2 - targetWorldX * viewport.scale;
    const targetY = windowSize.h / 2 - targetWorldY * viewport.scale;
    const clamped = clampViewport(targetX, targetY, viewport.scale);

    setViewport({ x: clamped.x, y: clamped.y, scale: viewport.scale });
  }, [ratio, windowSize, viewport.scale, setViewport, clampViewport]);

  // 전역 마우스 이벤트 리스너를 통한 끊김 없는 드래그 UX 연동
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      handleDragMove(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleDragMove]);

  // 마우스 다운 시 드래그 세션 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 홈 복귀 포스트잇 버튼을 누를 때는 드래그로 취급하지 않음
    if (target.closest('button')) return;

    isDraggingRef.current = true;
    gsap.killTweensOf(viewport); // 카메라이동 중이던 gsap 트윈 강제정지
    handleDragMove(e.clientX, e.clientY);
  };

  // 미니맵 클릭 시 해당 위치로 카메라 부드러운 이동 (월드 좌표 및 경계 제한 보간)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 드래그 마우스업 상황에서 오동작 방지
    if (isDraggingRef.current) return;

    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left - 4 - 8;
    const clickY = e.clientY - rect.top - 4 - 8;

    // 타겟 월드 좌표
    const targetWorldX = clickX / ratio;
    const targetWorldY = clickY / ratio;

    // 현재 카메라 중심의 월드 좌표 구하기
    const startWorldX = -viewport.x / viewport.scale + (windowSize.w / 2) / viewport.scale;
    const startWorldY = -viewport.y / viewport.scale + (windowSize.h / 2) / viewport.scale;

    const animObj = {
      worldX: startWorldX,
      worldY: startWorldY
    };

    gsap.killTweensOf(viewport);

    gsap.to(animObj, {
      worldX: targetWorldX,
      worldY: targetWorldY,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        const targetX = windowSize.w / 2 - animObj.worldX * viewport.scale;
        const targetY = windowSize.h / 2 - animObj.worldY * viewport.scale;
        const clamped = clampViewport(targetX, targetY, viewport.scale);
        setViewport({ x: clamped.x, y: clamped.y, scale: viewport.scale });
      }
    });
  };

  // 나침반 홈 복귀 버튼 동작 (월드 중심 좌표, 스케일 및 경계 제한 보간)
  const handleResetToCenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultScale = 0.85;

    // 현재 바라보는 화면 정중앙의 가상 월드 좌표
    const startWorldX = -viewport.x / viewport.scale + (windowSize.w / 2) / viewport.scale;
    const startWorldY = -viewport.y / viewport.scale + (windowSize.h / 2) / viewport.scale;

    // 타겟 월드 좌표 및 스케일 애니메이션 객체
    const animObj = {
      worldX: startWorldX,
      worldY: startWorldY,
      scale: viewport.scale
    };

    gsap.killTweensOf(viewport);

    gsap.to(animObj, {
      worldX: CENTER,
      worldY: CENTER,
      scale: defaultScale,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        const targetX = windowSize.w / 2 - animObj.worldX * animObj.scale;
        const targetY = windowSize.h / 2 - animObj.worldY * animObj.scale;
        const clamped = clampViewport(targetX, targetY, animObj.scale);
        setViewport({ x: clamped.x, y: clamped.y, scale: animObj.scale });
      }
    });
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '24px', 
        right: '24px', 
        zIndex: 1400, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end',
        gap: '8px', // 미니맵 바로 위에 착 붙도록 세로 gap 축소
        fontFamily: "'Nanum Pen Script', cursive",
        
        // 자동 탐색 시 미니맵 조작 UI 전체 페이드아웃 적용
        opacity: isAutoExploring ? 0 : 1,
        pointerEvents: isAutoExploring ? 'none' : 'auto',
        visibility: isAutoExploring ? 'hidden' : 'visible',
        transition: 'opacity 0.5s ease-in-out, visibility 0.5s ease-in-out'
      }}
    >
      {/* 홈 복귀 및 자동 탐색 가로 컨트롤러 */}
      <div style={{ display: 'flex', gap: '16px', transform: 'rotate(-1deg)', alignSelf: 'flex-end' }}>
        {/* 🧭 노란색 포스트잇 스타일의 홈 복귀 버튼 */}
        <div className="has-tooltip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
          <button
            onClick={handleResetToCenter}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'rotate(2deg) translateY(-2px) scale(1.05)';
              el.style.boxShadow = '2px 8px 14px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'rotate(-3deg) translateY(0) scale(1)';
              el.style.boxShadow = '1px 3px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)';
            }}
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FFF59D',
              border: 'none',
              boxShadow: '1px 3px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transform: 'rotate(-3deg) translateY(0) scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, background-color 0.2s',
              outline: 'none',
              borderRadius: '1px'
            }}
          >
            {/* 손드로잉 느낌의 집 아이콘 */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#4E342E" // 따뜻한 연필톤 브라운 테두리
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          
          <span className="custom-tooltip-text tooltip-top">중앙으로 돌아가기</span>
        </div>

        {/* 🚀 연분홍색 포스트잇 스타일의 자동 탐색 버튼 */}
        <div className="has-tooltip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAutoExplore();
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'rotate(-1deg) translateY(-2px) scale(1.05)';
              el.style.boxShadow = '2px 8px 14px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'rotate(3deg) translateY(0) scale(1)';
              el.style.boxShadow = '1px 3px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)';
            }}
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FFCDD2', // 옅은 핑크색 포스트잇
              border: 'none',
              boxShadow: '1px 3px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transform: 'rotate(3deg) translateY(0) scale(1)', // 방향을 엇갈리게 비틀어 생동감 부여
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, background-color 0.2s',
              outline: 'none',
              borderRadius: '1px'
            }}
          >
            {/* 재생 아이콘 */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#4E342E"
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>

          <span className="custom-tooltip-text tooltip-top">지도 자동 탐색</span>
        </div>
      </div>

      {/* 🗺️ 미니맵 외부 뼈대 (종이 질감 및 테두리 장착) */}
      <div
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onClick={handleMapClick}
        style={{
          padding: '8px', // 테두리와 내부 캔버스 사이의 고정된 여백 패딩
          backgroundColor: '#FDFCF8',
          // 찢어진 종이 질감 필터 제거하고 부드러운 그림자만 적용
          filter: 'drop-shadow(4px 8px 20px rgba(0,0,0,0.16))',
          border: '4px solid #B0A98F',
          borderStyle: 'solid',
          userSelect: 'none',
          position: 'relative'
        }}
      >
        {/* 내부 연산용 정밀 좌표 평면 (패딩 영향 없이 정확히 MAP_SIZE 내부 공간 구축) */}
        <div
          style={{
            width: `${MAP_SIZE}px`,
            height: `${MAP_SIZE}px`,
            position: 'relative',
            overflow: 'hidden', // 주황색 점선 사각형이 테두리 밖으로 번지지 않도록 완벽 가둠
          }}
        >
          {/* 맵 격자점 (아날로그 눈금선 느낌) */}
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px', opacity: 0.7 
            }} 
          />

          {/* 뷰포트 하이라이트 박스 (현재 화면이 비추는 영역) */}
          <div
            style={{
              position: 'absolute',
              left: `${miniX}px`,
              top: `${miniY}px`,
              width: `${miniW}px`,
              height: `${miniH}px`,
              border: '2.5px dashed #ff6b6b',
              backgroundColor: 'rgba(255,107,107,0.06)',
              pointerEvents: 'none',
              borderRadius: '2px',
              boxSizing: 'border-box',
              zIndex: 8
            }}
          />

          {/* 간선(연결선) 그리기 */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 3
            }}
          >
            {useMemo(() => links.map((link, idx) => {
              const s = PORTFOLIO_MAP[link.source];
              const t = PORTFOLIO_MAP[link.target];
              if (!s || !t) return null;
              return (
                <line
                  key={`mini-link-${idx}`}
                  x1={s.x * ratio}
                  y1={s.y * ratio}
                  x2={t.x * ratio}
                  y2={t.y * ratio}
                  stroke={s.color || '#999999'}
                  strokeWidth="1"
                  opacity="0.45"
                />
              );
            }), [links, ratio])}
          </svg>

          {/* 노드 점들 */}
          {/* ✨ [성능 최적화 #7] nodeDots를 useMemo로 쾐싱
              노드의 좌표/색상은 불변 → activeIds 변화 시에만 재계산 */}
          {useMemo(() => Object.entries(PORTFOLIO_MAP).map(([id, node]) => {
            const isActive = activeIds.includes(id);
            if (!isActive) return null;

            const isRoot = id === 'root';
            const nx = node.x * ratio;
            const ny = node.y * ratio;
            return (
              <div
                key={`mini-node-${id}`}
                style={{
                  position: 'absolute',
                  left: `${nx - (isRoot ? 4 : 2.5)}px`,
                  top: `${ny - (isRoot ? 4 : 2.5)}px`,
                  width: isRoot ? '8px' : '5px',
                  height: isRoot ? '8px' : '5px',
                  borderRadius: '50%',
                  backgroundColor: node.color || '#2C2C2C',
                  border: isRoot ? '1px solid #000' : 'none',
                  opacity: 1,
                  zIndex: isRoot ? 10 : 5,
                  transition: 'background-color 0.3s, transform 0.3s'
                }}
                title={node.caption}
              />
            );
          // eslint-disable-next-line react-hooks/exhaustive-deps
          }), [activeIds])}
        </div>
      </div>
    </div>
  );
});

MiniMap.displayName = 'MiniMap';

export default MiniMap;
