import React from 'react';
import { MapData } from './data';
import { CustomScrollContainer } from './CustomScrollContainer';

interface DashboardProps {
  selectedNode: MapData[string] | null;
  dashboardPos: 'left' | 'right' | 'top' | null;
  onClose: () => void;
}

const RULED_LINES_TEXTURE = `repeating-linear-gradient(transparent 0px, transparent 32px, rgba(160, 155, 125, 0.3) 32px, rgba(160, 155, 125, 0.3) 34px)`;

const tagColors = ['#FFF9C4', '#F1F8E9', '#E0F7FA', '#F3E5F5', '#FFE0B2', '#FFCDD2'];

const Dashboard: React.FC<DashboardProps> = ({ selectedNode, dashboardPos, onClose }) => {
  // ✨ [성능 최적화 #13] isPolaroidHovered, isBtnHovered React state 제거
  // hover 시마다 Dashboard 전체 리렌더링이 발생하던 원인 제거
  // onMouseEnter/Leave에서 e.currentTarget.style 직접 조작으로 대체

  if (!selectedNode || !dashboardPos) return null;

  return (
    <>
      {/* 바깥 여백 클릭 시 닫기 */}
      <div 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, backgroundColor: 'transparent', cursor: 'alias' }} 
        onClick={onClose} 
      />



      <div 
        className="paper-dashboard-container"
        style={{
          position: 'fixed', top: '24px', right: '24px', bottom: '24px', width: '460px',
          zIndex: 2000, display: 'flex', flexDirection: 'column',
          animation: 'memoSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: 'none' 
        }}
      >
        {/* 플레이트 1: 그라데이션과 찢어진 테두리(filter) 적용 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `linear-gradient(135deg, #FDFCF8 0%, #F4F0E6 100%)`, 
            boxShadow: 'inset 0 0 60px rgba(160, 155, 125, 0.15)',
            filter: 'url(#static-paper-edge) drop-shadow(-14px 18px 30px rgba(35, 35, 33, 0.15)) drop-shadow(-2px 4px 8px rgba(0, 0, 0, 0.06))',
            pointerEvents: 'auto'
          }}
        />

        {/* 모바일 화면 상단 드래그 바 (장식용) */}
        <div 
          className="mobile-drag-handle"
          style={{
            position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
            width: '60px', height: '6px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '3px',
            zIndex: 10, display: 'none'
          }}
        />

        <div
          style={{
            position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column',
            padding: '76px 44px 52px 48px', pointerEvents: 'auto', height: '100%', overflow: 'hidden',
            fontFamily: "'Nanum Pen Script', cursive" 
          }}
        >
          {/* 바인딩 상단 띠 */}
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

          {/* 닫기 버튼 */}
          <button 
            onClick={onClose}
            className="has-tooltip"
            style={{
              position: 'absolute', top: '48px', right: '32px',
              background: 'transparent', border: 'none',
              fontSize: '2.2rem', color: 'rgba(0,0,0,0.4)', cursor: 'pointer',
              fontFamily: "'Nanum Pen Script', cursive",
              zIndex: 10,
              transform: 'rotate(5deg)',
              transition: 'color 0.2s, transform 0.2s',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6b6b';
              e.currentTarget.style.transform = 'rotate(-5deg) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'rotate(5deg) scale(1)';
            }}
          >
            ✕
            <span className="custom-tooltip-text tooltip-bottom">닫기</span>
          </button>

          {/* ID 태그 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', transform: 'rotate(-1deg)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: selectedNode.color || '#2C2C2C', filter: 'url(#handwriting-ink)' }} />
            <span style={{ fontSize: '1.2rem', color: '#666666', letterSpacing: '0.05em', filter: 'url(#handwriting-ink)' }}>
              {selectedNode.id}
            </span>
          </div>

          {/* 노드 캡션 */}
          <h2 style={{ 
            fontSize: '3.0rem', margin: '0 0 12px 0', color: '#1A1A1A', 
            fontWeight: 'normal', letterSpacing: '-0.02em', lineHeight: 1.2,
            transform: 'rotate(-1.5deg)', transformOrigin: 'left center',
            filter: 'url(#handwriting-ink)', mixBlendMode: 'multiply',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)', opacity: 0.9 
          }}>
            {selectedNode.caption}
          </h2>

          <div style={{ 
            width: '80px', height: '2px', backgroundColor: selectedNode.color || '#2C2C2C', 
            marginBottom: '16px', opacity: 0.7, transform: 'rotate(-1deg)', filter: 'url(#handwriting-ink)' 
          }} />

          {/* 1. 폴라로이드 이미지 프레임을 본문 스크롤 바깥 상단으로 추출 (줄노트 어긋남 원천 차단) */}
          {selectedNode.img && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', pointerEvents: 'auto' }}>
              <div 
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.1)';
                  el.style.transform = 'rotate(1.5deg) translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)';
                  el.style.transform = 'rotate(-2deg)';
                }}
                style={{
                  background: '#ffffff',
                  padding: '10px 10px 24px 10px',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  display: 'inline-block',
                  transform: 'rotate(-2deg)',
                  transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                {/* 마스킹 테이프 장식 */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-1deg)',
                  width: '80px',
                  height: '20px',
                  backgroundColor: 'rgba(245, 235, 185, 0.85)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  borderLeft: '1.5px dashed rgba(0, 0, 0, 0.1)',
                  borderRight: '1.5px dashed rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  pointerEvents: 'none'
                }} />
                <img 
                  src={selectedNode.img} 
                  alt={selectedNode.caption} 
                  style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '1px', border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
            </div>
          )}

          {/* 스크롤 본문 */}
          <CustomScrollContainer 
            className="memo-content-scroll"
            style={{ flex: 1 }}
            contentStyle={{ 
              paddingRight: '8px', 
              paddingTop: '0px', // 이미지 이탈에 따른 패딩 초기화
              backgroundImage: `${RULED_LINES_TEXTURE}`,
              backgroundSize: '100% 34px', 
              backgroundAttachment: 'local' 
            }}
            thumbColor="rgba(160, 155, 125, 0.4)"
            thumbHoverColor="rgba(160, 155, 125, 0.6)"
          >
            {/* 2. 설명 글 (가로줄 높이 34px와 오차 없이 픽셀 매칭되도록 정밀 조율) */}
            <p style={{ 
              margin: 0, 
              paddingTop: '6px', // 첫 줄 폰트 기준선 맞춤 오프셋
              fontSize: '1.65rem', 
              lineHeight: '34px', 
              color: '#2A2A2A', 
              wordBreak: 'keep-all',
              transform: 'rotate(-0.5deg)', 
              transformOrigin: 'left top',
              filter: 'url(#handwriting-ink)', 
              mixBlendMode: 'multiply',
              textShadow: '0.5px 0.5px 1.5px rgba(0,0,0,0.08)', 
              opacity: 0.95
            }}>
              {selectedNode.description || '상세 프로젝트 준비중입니다. 인터랙티브 노드 맵 포트폴리오를 통해 세부 정보를 곧 업데이트할 예정입니다.'}
            </p>

            {/* 3. 스티커 테이프 스타일의 기술 스택 태그 (인라인 스타일화) */}
            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div style={{ marginTop: '36px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', transform: 'rotate(0.5deg)' }}>
                {selectedNode.tags.map((tag, idx) => {
                  const color = tagColors[idx % tagColors.length];
                  const rot = (Math.sin(idx + 10) * 3).toFixed(1);
                  return (
                    <span 
                      key={tag} 
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        margin: '2px',
                        fontSize: '1.25rem',
                        color: '#333333',
                        position: 'relative',
                        backgroundColor: color,
                        boxShadow: '1px 2px 4px rgba(0, 0, 0, 0.08)',
                        transform: `rotate(${rot}deg)`,
                        borderLeft: '2.5px solid rgba(0,0,0,0.15)',
                        fontFamily: "'Nanum Pen Script', cursive",
                        userSelect: 'none'
                      }}
                    >
                      #{tag}
                    </span>
                  );
                })}
              </div>
            )}
          </CustomScrollContainer>

          {/* 4. 찢어진 영수증 스타일의 프로젝트 바로가기 버튼 */}
          {selectedNode.linkUrl && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', transform: 'rotate(-0.5deg)' }}>
              <a 
                href={selectedNode.linkUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ textDecoration: 'none', display: 'block', width: '100%' }}
              >
                <button 
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'rotate(-1.5deg) translateY(-2px)';
                    el.style.boxShadow = '0 10px 22px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'rotate(1deg)';
                    el.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08), inset 0 0 10px rgba(0, 0, 0, 0.02)';
                  }}
                  style={{
                    position: 'relative',
                    background: '#ffffff',
                    color: '#2C2C2C',
                    fontSize: '1.8rem',
                    padding: '16px 28px 20px 28px',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: "'Nanum Pen Script', cursive",
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08), inset 0 0 10px rgba(0, 0, 0, 0.02)',
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 90%, 95% 100%, 90% 90%, 85% 100%, 80% 90%, 75% 100%, 70% 90%, 65% 100%, 60% 90%, 55% 100%, 50% 90%, 45% 100%, 40% 90%, 35% 100%, 30% 90%, 25% 100%, 20% 90%, 15% 100%, 10% 90%, 5% 100%, 0% 90%)',
                    transform: 'rotate(1deg)',
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%'
                  }}
                >
                  <span>프로젝트 상세보기</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => { (e.currentTarget as SVGSVGElement).style.transform = 'scale(1.1) rotate(5deg)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as SVGSVGElement).style.transform = 'none'; }}
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
      {/* ✨ style 태그 제거: memoSlideIn, 스크롤바 스타일은 globals.css로 이전 */}
    </>
  );
};

export default Dashboard;