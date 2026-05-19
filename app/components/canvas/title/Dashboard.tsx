import React from 'react';
import { MapData } from './data';

interface DashboardProps {
  selectedNode: MapData[string] | null;
  dashboardPos: 'left' | 'right' | 'top' | null;
  onClose: () => void;
}

// ✨ 대시보드 종이 노이즈 질감 복구 완료
const PAPER_NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.12'/%3E%3C/svg%3E")`;

const RULED_LINES_TEXTURE = `repeating-linear-gradient(transparent 0px, transparent 32px, rgba(160, 155, 125, 0.3) 32px, rgba(160, 155, 125, 0.3) 34px)`;

const Dashboard: React.FC<DashboardProps> = ({ selectedNode, dashboardPos, onClose }) => {
  if (!selectedNode || !dashboardPos) return null;

  return (
    <>
      {/* 화면 전체 투명 암전 레이어 */}
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 1999, 
          backgroundColor: 'transparent',
          cursor: 'alias'
        }} 
        onClick={onClose} 
      />

      {/* 테두리와 잉크 번짐 처리를 위한 전용 SVG 필터 복구 완료 */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <filter id="static-paper-edge" x="-10%" y="-10%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="5" result="paper-noise" />
          <feDisplacementMap in="SourceGraphic" in2="paper-noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        
        <filter id="handwriting-ink" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="3" result="ink-noise" />
          <feDisplacementMap in="SourceGraphic" in2="ink-noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="0.4" />
        </filter>
      </svg>

      {/* 최상위 슬라이드 제어 컨테이너 */}
      <div 
        className="paper-dashboard-container"
        style={{
          position: 'fixed', 
          top: '24px',
          right: '24px',
          bottom: '24px',
          width: '460px',
          zIndex: 2000, 
          display: 'flex', 
          flexDirection: 'column',
          animation: 'memoSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: 'none' 
        }}
      >
        {/* 플레이트 1: 아날로그 종이 본체 레이어 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `${PAPER_NOISE_TEXTURE}, linear-gradient(135deg, #FDFCF8 0%, #F4F0E6 100%)`,
            boxShadow: 'inset 0 0 60px rgba(160, 155, 125, 0.15)',
            filter: 'url(#static-paper-edge) drop-shadow(-14px 18px 30px rgba(35, 35, 33, 0.15)) drop-shadow(-2px 4px 8px rgba(0, 0, 0, 0.06))',
            pointerEvents: 'auto'
          }}
        />

        {/* 플레이트 2: 디지털 레이어 (손글씨 서체 적용 및 본문 레이아웃) */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '76px 44px 52px 48px', 
            pointerEvents: 'auto',
            height: '100%',
            overflow: 'hidden',
            fontFamily: "'Nanum Pen Script', cursive" 
          }}
        >
          {/* 상단 제본 및 타공 효과 영역 */}
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, height: '40px', 
              backgroundColor: selectedNode.color || '#3A3A3A', 
              backgroundImage: 'radial-gradient(#FDFCF8 1px, transparent 1px)', 
              backgroundSize: '12px 12px', backgroundPosition: 'center',
              opacity: 0.9 
            }} 
            className="memo-binding-area" 
          />

          {/* 메타 정보 노드 상징 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', transform: 'rotate(-1deg)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: selectedNode.color || '#2C2C2C', filter: 'url(#handwriting-ink)' }} />
            <span style={{ fontSize: '1.2rem', color: '#666666', letterSpacing: '0.05em', filter: 'url(#handwriting-ink)' }}>
              {selectedNode.id}
            </span>
          </div>

          {/* 제목 영역 */}
          <h2 style={{ 
            fontSize: '3.0rem', margin: '0 0 12px 0', color: '#1A1A1A', 
            fontWeight: 'normal', letterSpacing: '-0.02em', lineHeight: 1.2,
            transform: 'rotate(-1.5deg)', 
            transformOrigin: 'left center',
            filter: 'url(#handwriting-ink)', 
            mixBlendMode: 'multiply',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)', 
            opacity: 0.9 
          }}>
            {selectedNode.caption}
          </h2>

          {/* 연필 장식선 */}
          <div style={{ 
            width: '80px', height: '2px', backgroundColor: selectedNode.color || '#2C2C2C', 
            marginBottom: '32px', opacity: 0.7, 
            transform: 'rotate(-1deg)',
            filter: 'url(#handwriting-ink)' 
          }} />

          {/* 본문 상세 설명 영역 */}
          <div 
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '8px',
              paddingTop: '4px',
              backgroundImage: `${PAPER_NOISE_TEXTURE}, ${RULED_LINES_TEXTURE}`,
              backgroundSize: 'auto, 100% 34px',
              backgroundAttachment: 'local' 
            }} 
            className="memo-content-scroll"
          >
            {/* 본문 텍스트 */}
            <p style={{ 
              margin: 0, fontSize: '1.55rem', lineHeight: '34px', color: '#2A2A2A', wordBreak: 'keep-all',
              transform: 'rotate(-0.5deg)', 
              transformOrigin: 'left top',
              filter: 'url(#handwriting-ink)',
              mixBlendMode: 'multiply',
              textShadow: '0.5px 0.5px 1.5px rgba(0,0,0,0.1)',
              opacity: 0.9
            }}>
              {selectedNode.description || '상세 프로젝트 준비중입니다. 인터랙티브 노드 맵 포트폴리오를 통해 세부 정보를 곧 업데이트할 예정입니다.'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap');

        @keyframes memoSlideIn {
          0% { 
            transform: translateX(calc(100% + 40px)) rotate(2.5deg); 
            opacity: 0; 
          }
          100% { 
            transform: translateX(0) rotate(0deg); 
            opacity: 1; 
          }
        }

        .memo-content-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .memo-content-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .memo-content-scroll::-webkit-scrollbar-thumb {
          background: rgba(160, 155, 125, 0.4);
          border-radius: 4px;
        }
        .memo-content-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(160, 155, 125, 0.6);
        }
      `}</style>
    </>
  );
};

export default Dashboard;