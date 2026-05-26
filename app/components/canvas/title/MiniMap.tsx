import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { PORTFOLIO_MAP, CENTER } from './data';

interface MiniMapProps {
  viewport: { x: number; y: number; scale: number };
  setViewport: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number }>>;
  activeIds: string[];
}

const VIRTUAL_SIZE = 4000;
const MAP_SIZE = 240; // 미니맵 크기 대폭 확장 (180px -> 240px)

export const MiniMap: React.FC<MiniMapProps> = ({ viewport, setViewport, activeIds }) => {
  const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 });
  const mapRef = useRef<HTMLDivElement>(null);
  const [isBtnHovered, setIsBtnHovered] = useState(false);

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

  // 미니맵 클릭 시 해당 위치로 카메라 부드러운 이동 (버그 방지를 위한 월드 좌표 보간)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    
    // 테두리(4px)와 내부 패딩(8px)을 정확히 제외하여 내부 240px 캔버스 전용 좌표 산출
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

    gsap.killTweensOf(viewport); // 기존 카메라 트윈 정지

    gsap.to(animObj, {
      worldX: targetWorldX,
      worldY: targetWorldY,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        // 매 프레임 보간되는 월드 중심 좌표에 뷰포트 매핑 (튀지 않음)
        const x = windowSize.w / 2 - animObj.worldX * viewport.scale;
        const y = windowSize.h / 2 - animObj.worldY * viewport.scale;
        setViewport({ x, y, scale: viewport.scale });
      }
    });
  };

  // 나침반 홈 복귀 버튼 동작 (버그 완전 수정: 월드 중심 좌표와 스케일을 함께 동시 보간)
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

    gsap.killTweensOf(viewport); // 기존 카메라 트윈 정지

    gsap.to(animObj, {
      worldX: CENTER,
      worldY: CENTER,
      scale: defaultScale,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        // 매 프레임의 보간 스케일에 맞춰 뷰포트 좌표 재계산 (구석으로 튀는 현상 완전 차단)
        const x = windowSize.w / 2 - animObj.worldX * animObj.scale;
        const y = windowSize.h / 2 - animObj.worldY * animObj.scale;
        setViewport({ x, y, scale: animObj.scale });
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
        gap: '30px', // 복귀 포스트잇 버튼과의 겹침 차단을 위한 넉넉한 세로 마진
        fontFamily: "'Nanum Pen Script', cursive"
      }}
    >
      {/* 🧭 노란색 포스트잇 스타일의 홈 복귀 버튼 (점착식 메타포에 따라 부가적인 테이프 삭제) */}
      <button
        onClick={handleResetToCenter}
        onMouseEnter={() => setIsBtnHovered(true)}
        onMouseLeave={() => setIsBtnHovered(false)}
        title="중앙(Profile)으로 돌아가기"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: '#FFF59D', // 포스트잇 고유의 따스한 연노랑
          border: 'none',
          boxShadow: isBtnHovered
            ? '2px 8px 14px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)'
            : '1px 3px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 0 2px 0',
          position: 'relative',
          transform: isBtnHovered ? 'rotate(2deg) translateY(-2px) scale(1.05)' : 'rotate(-3deg) translateY(0) scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, background-color 0.2s',
          outline: 'none',
          borderRadius: '1px' // 완벽한 사각형 종이 질감
        }}
      >
        {/* 손드로잉 느낌의 집 아이콘 */}
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#4E342E" // 따뜻한 연필톤 브라운 테두리
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ marginBottom: '2px' }}
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#5D4037', letterSpacing: '0.5px', lineHeight: 1 }}>
          HOME
        </span>
      </button>

      {/* 🗺️ 미니맵 외부 뼈대 (종이 질감 및 테두리 장착) */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        style={{
          padding: '8px', // 테두리와 내부 캔버스 사이의 고정된 아날로그 여백 패딩
          backgroundColor: '#FDFCF8',
          // 찢어진 종이 질감 필터 적용
          filter: 'url(#static-paper-edge) drop-shadow(4px 8px 20px rgba(0,0,0,0.16))',
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
              boxSizing: 'border-box'
            }}
          />

          {/* 노드 점들 */}
          {Object.entries(PORTFOLIO_MAP).map(([id, node]) => {
            const isActive = activeIds.includes(id);
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
                  backgroundColor: isActive ? (node.color || '#2C2C2C') : '#CCCCCC',
                  border: isRoot ? '1px solid #000' : 'none',
                  opacity: isActive ? 1 : 0.4,
                  zIndex: isRoot ? 10 : 5,
                  transition: 'background-color 0.3s, transform 0.3s'
                }}
                title={node.caption}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
