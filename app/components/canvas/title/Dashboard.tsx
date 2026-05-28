import React from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { MapData } from './data';
import { CustomScrollContainer } from './CustomScrollContainer';
import { useTransitionContext } from '../../../context/TransitionContext';

interface DashboardProps {
  selectedNode: MapData[string] | null;
  dashboardPos: 'left' | 'right' | 'top' | null;
  onClose: () => void;
  isRestored?: boolean;
  getViewport: () => { x: number; y: number; scale: number };
}

const RULED_LINES_TEXTURE = `repeating-linear-gradient(transparent 0px, transparent 32px, rgba(160, 155, 125, 0.3) 32px, rgba(160, 155, 125, 0.3) 34px)`;

const tagColors = ['#FFF9C4', '#F1F8E9', '#E0F7FA', '#F3E5F5', '#FFE0B2', '#FFCDD2'];

// ─────────────────────────────────────────────────────────────────
// animState 설명:
//   'hidden'   : 대시보드가 DOM에서 제거된 상태 (return null)
//   'entering' : 슬라이드인 애니메이션 재생 중
//   'visible'  : 완전히 열린 정지 상태 (복원 시 애니메이션 없이 바로 표시)
//   'leaving'  : 슬라이드아웃 애니메이션 재생 중
// ─────────────────────────────────────────────────────────────────
type AnimState = 'hidden' | 'entering' | 'visible' | 'leaving';

const Dashboard: React.FC<DashboardProps> = React.memo(({ selectedNode, dashboardPos, onClose, isRestored, getViewport }) => {
  const { startTransition } = useTransitionContext();

  const ANIM_DURATION = 0.6; // seconds
  // ✨ animState: 대시보드의 생명주기를 단일 상태로 관리
  const [animState, setAnimState] = React.useState<AnimState>(() => {
    // 초기값: selectedNode가 있으면(복원) 바로 visible, 없으면 hidden
    if (selectedNode && dashboardPos) {
      return isRestored ? 'visible' : 'entering';
    }
    return 'hidden';
  });

  // ✨ displayNode/displayPos: 닫기 애니메이션 중에도 마지막 데이터를 표시하기 위해 내부적으로 캐싱
  const [displayNode, setDisplayNode] = React.useState<MapData[string] | null>(selectedNode);
  const [displayPos, setDisplayPos] = React.useState<'left' | 'right' | 'top' | null>(dashboardPos);
  // Track if close was triggered manually to invoke onClose after animation
  const [isManualClose, setIsManualClose] = React.useState(false);

  const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // selectedNode 이전 값 추적: null→non-null(오픈) / non-null→non-null(노드 변경) / non-null→null(외부 닫기) 감지
  const prevSelectedNodeRef = React.useRef<typeof selectedNode>(selectedNode);

  React.useEffect(() => {
    const prevNode = prevSelectedNodeRef.current;
    if (prevNode === selectedNode) return; // 노드 정보 자체가 변하지 않았다면 아무 처리도 하지 않음
    prevSelectedNodeRef.current = selectedNode;

    if (selectedNode && dashboardPos) {
      // ── 새로운 노드가 오픈되거나 다른 노드로 교체됨 ──
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      setDisplayNode(selectedNode);
      setDisplayPos(dashboardPos);
      setAnimState(isRestored ? 'visible' : 'entering');
    } else if (!selectedNode && prevNode) {
      // ── 외부 닫기 (non-null -> null) ──
      if (animState !== 'leaving' && animState !== 'hidden') {
        // Trigger closing animation; onClose will be handled separately if manual
        setAnimState('leaving');
        // No timer; GSAP will handle transition to hidden state
      }
    }
  }, [selectedNode, dashboardPos, isRestored, animState]);

  // ── Dashboard opening animation (natural easing) ──
  // Opening animation (already using GSAP)
  React.useEffect(() => {
    if (animState === 'entering') {
      gsap.fromTo(
        '.paper-dashboard-container',
        { x: 'calc(100% + 40px)', rotate: 2.5, opacity: 0 },
        { x: 0, rotate: 0, opacity: 1, duration: ANIM_DURATION, ease: 'elastic.out(1, 0.4)', onComplete: () => setAnimState('visible') }
      );
    }
  }, [animState]);

  // Closing animation with bounce effect
  React.useEffect(() => {
    if (animState === 'leaving') {
      gsap.to('.paper-dashboard-container', {
        x: 'calc(100% + 40px)',
        rotate: 2.5,
        opacity: 0,
        duration: ANIM_DURATION,
        ease: 'elastic.out(1, 0.4)',
        onComplete: () => {
          setAnimState('hidden');
          if (isManualClose) {
            onClose();
            setIsManualClose(false);
          }
        },
      });
    }
  }, [animState]);

  // 닫기 핸들러: 슬라이드아웃 재생 → 600ms 후 실제 onClose 호출
  const handleClose = React.useCallback(() => {
    if (animState === 'leaving' || animState === 'hidden') return;
    setIsManualClose(true);
    setAnimState('leaving');
  }, [animState, onClose]);

  // 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); };
  }, []);

  // hidden이면 DOM에서 제거
  if (animState === 'hidden') return null;

  // ✨ [성능 최적화 #13] isPolaroidHovered, isBtnHovered React state 제거
  // hover 시마다 Dashboard 전체 리렌더링이 발생하던 원인 제거
  // onMouseEnter/Leave에서 e.currentTarget.style 직접 조작으로 대체

  // 렌더링에 사용할 노드 (닫기 중에도 이전 데이터 유지)
  const renderNode = displayNode!;
  const renderPos = displayPos;

  return (
    <>
      <style>{`
        .dashboard-leaving {
          animation: memoSlideOut 0.6s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }
        @keyframes memoSlideOut {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(calc(100% + 40px)) rotate(2.5deg); opacity: 0; }
        }
      `}</style>
      {/* 바깥 여백 클릭 시 닫기 */}
      <div 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, backgroundColor: 'transparent', cursor: 'alias' }} 
        onClick={handleClose} 
      />

      <div 
        className={`paper-dashboard-container dashboard-${animState}`}
        style={{
          position: 'fixed', top: '24px', right: '24px', bottom: '24px', width: '460px',
          zIndex: 2000, display: 'flex', flexDirection: 'column',
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
              backgroundColor: renderNode.color || '#3A3A3A', 
              backgroundImage: 'radial-gradient(#FDFCF8 1px, transparent 1px)', 
              backgroundSize: '12px 12px', backgroundPosition: 'center',
              opacity: 0.9 
            }} 
            className="memo-binding-area" 
          />

          {/* 닫기 버튼 */}
          <button 
            onClick={handleClose}
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
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: renderNode.color || '#2C2C2C', filter: 'url(#handwriting-ink)' }} />
            <span style={{ fontSize: '1.2rem', color: '#666666', letterSpacing: '0.05em', filter: 'url(#handwriting-ink)' }}>
              {renderNode.id}
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
            {renderNode.caption}
          </h2>

          <div style={{ 
            width: '80px', height: '2px', backgroundColor: renderNode.color || '#2C2C2C', 
            marginBottom: '16px', opacity: 0.7, transform: 'rotate(-1deg)', filter: 'url(#handwriting-ink)' 
          }} />

          {/* 1. 폴라로이드 이미지 프레임을 본문 스크롤 바깥 상단으로 추출 (줄노트 어긋남 원천 차단) */}
          {renderNode.img && (
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
                  src={renderNode.img} 
                  alt={renderNode.caption} 
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
              {renderNode.description || '상세 프로젝트 준비중입니다. 인터랙티브 노드 맵 포트폴리오를 통해 세부 정보를 곧 업데이트할 예정입니다.'}
            </p>

            {/* 3. 스티커 테이프 스타일의 기술 스택 태그 (인라인 스타일화) */}
            {renderNode.tags && renderNode.tags.length > 0 && (
              <div style={{ marginTop: '36px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', transform: 'rotate(0.5deg)' }}>
                {renderNode.tags.map((tag, idx) => {
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
          {renderNode.linkUrl && (() => {
            const isExternal = renderNode.linkUrl.startsWith('http://') || renderNode.linkUrl.startsWith('https://');
            const buttonContent = (
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
            );

            const handleDetailClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (!renderNode.linkUrl) return;
              const vp = getViewport();
              const screenX = renderNode.x * vp.scale + vp.x;
              const screenY = renderNode.y * vp.scale + vp.y;
              const sizeVal = renderNode.size ?? 85;
              const screenRadius = sizeVal * 1.15 * vp.scale;
              const screenImageRadius = (sizeVal - 5) * 1.15 * vp.scale;
              startTransition(renderNode.linkUrl, screenX, screenY, screenRadius, screenImageRadius, renderNode.img || '', renderNode.color || '#2C2C2C');
            };

            return (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', transform: 'rotate(-0.5deg)' }}>
                {isExternal ? (
                  <a 
                    href={renderNode.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ textDecoration: 'none', display: 'block', width: '100%' }}
                  >
                    {buttonContent}
                  </a>
                ) : (
                  <div 
                    onClick={handleDetailClick}
                    style={{ textDecoration: 'none', display: 'block', width: '100%' }}
                  >
                    {buttonContent}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      {/* ✨ style 태그 제거: memoSlideIn, 스크롤바 스타일은 globals.css로 이전 */}
    </>
  );
});

export default Dashboard;