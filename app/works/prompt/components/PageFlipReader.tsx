'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MagazineIssue, MagazinePage } from '../data/magazines';
import { soundManager } from './SoundManager';

interface PageFlipReaderProps {
  issue: MagazineIssue;
}

export default function PageFlipReader({ issue }: PageFlipReaderProps) {
  // 현재 펼쳐진 페이지 인덱스 (0: Cover & Page 1 spread or Cover spread)
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [flipProgress, setFlipProgress] = useState(0); // 0 to 1
  const [zoomPage, setZoomPage] = useState<MagazinePage | null>(null);

  const totalPages = issue.pages.length;

  const handleNextPage = useCallback(() => {
    if (isFlipping || currentPageIndex >= totalPages - 1) return;
    soundManager.playPaperTurn();
    setIsFlipping(true);
    setFlipDirection('next');

    // 60FPS GSAP-style smooth flip animation loop
    let start: number | null = null;
    const duration = 500; // ms

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setFlipProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentPageIndex(prev => Math.min(prev + 1, totalPages - 1));
        setIsFlipping(false);
        setFlipProgress(0);
      }
    };
    requestAnimationFrame(animate);
  }, [isFlipping, currentPageIndex, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (isFlipping || currentPageIndex <= 0) return;
    soundManager.playPaperTurn();
    setIsFlipping(true);
    setFlipDirection('prev');

    let start: number | null = null;
    const duration = 500;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setFlipProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
        setIsFlipping(false);
        setFlipProgress(0);
      }
    };
    requestAnimationFrame(animate);
  }, [isFlipping, currentPageIndex]);

  // 키보드 조작 (Left / Right Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  const currPageObj = issue.pages[currentPageIndex];
  const nextFlipPageObj = flipDirection === 'next' ? issue.pages[currentPageIndex + 1] : issue.pages[currentPageIndex - 1];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '850px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 매거진 본체 - Exact 1080 * 1350 (4:5) Aspect Ratio Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5',
          backgroundColor: '#FCFAF2',
          borderRadius: '4px 12px 12px 4px',
          boxShadow: `
            0 25px 50px rgba(0, 0, 0, 0.55),
            0 10px 20px rgba(0, 0, 0, 0.4),
            inset 0 0 100px rgba(0, 0, 0, 0.05)
          `,
          perspective: '1500px',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* 현재 베이스 페이지 (Static Base Page) */}
        <PageGraphic
          page={currPageObj}
          issue={issue}
          onClick={() => setZoomPage(currPageObj)}
        />

        {/* 종이 넘김 3D 애니메이션 레이어 (Flipping Page Curl Overlay) */}
        {isFlipping && nextFlipPageObj && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
              transform: flipDirection === 'next'
                ? `rotateY(${-flipProgress * 180}deg)`
                : `rotateY(${(1 - flipProgress) * 180}deg)`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              zIndex: 10,
              backgroundColor: '#FCFAF2',
              backfaceVisibility: 'hidden',
              transition: 'none',
            }}
          >
            {/* 뒤집히는 표면 페이지 그래픽 */}
            <PageGraphic
              page={flipProgress < 0.5 ? currPageObj : nextFlipPageObj}
              issue={issue}
            />

            {/* dynamic 종이 휘어짐 그림자 셰이딩 (Dynamic Paper Curl Shadow) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(90deg, 
                  rgba(0,0,0,${Math.sin(flipProgress * Math.PI) * 0.4}) 0%, 
                  rgba(255,255,255,${Math.sin(flipProgress * Math.PI) * 0.2}) 50%, 
                  rgba(0,0,0,${Math.sin(flipProgress * Math.PI) * 0.3}) 100%)`,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {/* 책등 수직 곡면 깊이 그림자 (Spine Crease Depth) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '16px',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />

        {/* 우측/좌측 종이 넘기기 터치 Hotspot (Interactive Edge Curl Trigger) */}
        <div
          onClick={handlePrevPage}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '20%',
            height: '100%',
            cursor: currentPageIndex > 0 ? 'pointer' : 'default',
            zIndex: 6,
          }}
          title="이전 페이지 (◀)"
        />
        <div
          onClick={handleNextPage}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '20%',
            height: '100%',
            cursor: currentPageIndex < totalPages - 1 ? 'pointer' : 'default',
            zIndex: 6,
          }}
          title="다음 페이지 (▶)"
        />
      </div>

      {/* 매거진 조작 하단 대시보드 (Controls Bar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginTop: '20px',
          padding: '12px 20px',
          background: 'rgba(30, 22, 16, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          boxSizing: 'border-box',
        }}
      >
        {/* 이전 버튼 */}
        <button
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0 || isFlipping}
          style={{
            background: currentPageIndex === 0 ? 'rgba(255,255,255,0.05)' : issue.themeColor,
            color: currentPageIndex === 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          ◀ 이전
        </button>

        {/* 페이지 번호 표시 */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1rem',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {currentPageIndex + 1} / {totalPages}
          </span>
          <span
            style={{
              marginLeft: '8px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
              fontFamily: "'Nanum Myeongjo', serif",
            }}
          >
            ({currPageObj.title})
          </span>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNextPage}
          disabled={currentPageIndex === totalPages - 1 || isFlipping}
          style={{
            background: currentPageIndex === totalPages - 1 ? 'rgba(255,255,255,0.05)' : issue.themeColor,
            color: currentPageIndex === totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#FFFFFF',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: currentPageIndex === totalPages - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          다음 ▶
        </button>
      </div>

      {/* 페이지 세부 확대 모달 (Zoom Modal) */}
      {zoomPage && (
        <div
          onClick={() => setZoomPage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '30px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '650px',
              aspectRatio: '4 / 5',
              backgroundColor: '#FCFAF2',
              borderRadius: '8px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
          >
            <PageGraphic page={zoomPage} issue={issue} />
            <button
              onClick={() => setZoomPage(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.6)',
                color: '#FFF',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 1080 * 1350 규격 렌더링 캔버스 그래픽 컴포넌트
interface PageGraphicProps {
  page: MagazinePage;
  issue: MagazineIssue;
  onClick?: () => void;
}

function PageGraphic({ page, issue, onClick }: PageGraphicProps) {
  const isCover = page.type === 'cover';
  const isBack = page.type === 'back';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: isCover ? issue.coverBg : isBack ? '#1C1613' : '#FBF9F4',
        color: isCover || isBack ? '#FAF3E0' : '#2A2421',
        padding: '40px 36px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'zoom-in' : 'default',
        overflow: 'hidden',
      }}
    >
      {/* 종이 아날로그 미세 질감 노이즈 필터 래퍼 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0)',
          backgroundSize: '8px 8px',
          pointerEvents: 'none',
        }}
      />

      {/* 헤더 바 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isCover || isBack ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
          paddingBottom: '12px',
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '3px',
            color: isCover || isBack ? issue.accentColor : issue.themeColor,
          }}
        >
          PROMPT
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            opacity: 0.7,
          }}
        >
          VOL. 0{issue.vol} — PAGE {page.pageNumber}
        </span>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          margin: '20px 0',
          zIndex: 2,
        }}
      >
        {isCover ? (
          /* 커버 페이지 렌더링 */
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '4px',
                color: issue.accentColor,
                marginBottom: '10px',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              INSTAGRAM MAGAZINE ARCHIVE
            </div>
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: 900,
                margin: '0 0 10px 0',
                letterSpacing: '4px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.1,
              }}
            >
              PROMPT
            </h1>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: issue.accentColor,
                fontFamily: "'Nanum Myeongjo', serif",
                marginBottom: '30px',
              }}
            >
              {page.subtitle}
            </div>

            {/* 커버 대표 히어로 텍스처 아트 박스 */}
            <div
              style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${issue.themeColor} 0%, #111111 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
                margin: '0 auto',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span
                style={{
                  fontSize: '4rem',
                  fontWeight: 900,
                  opacity: 0.15,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                VOL.0{issue.vol}
              </span>
            </div>
          </div>
        ) : isBack ? (
          /* 뒷표지 렌더링 */
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: "'Inter', sans-serif" }}>
              {page.title}
            </h2>
            <p style={{ color: issue.accentColor, fontFamily: "'Nanum Myeongjo', serif" }}>
              {page.subtitle}
            </p>
            {page.content?.map((text, idx) => (
              <p key={idx} style={{ opacity: 0.6, fontSize: '0.85rem' }}>{text}</p>
            ))}
          </div>
        ) : (
          /* 일반 에디토리얼 / 기사 / 갤러리 페이지 렌더링 */
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: issue.themeColor,
                letterSpacing: '2px',
                marginBottom: '6px',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {page.type.toUpperCase()}
            </div>
            <h2
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                margin: '0 0 16px 0',
                fontFamily: "'Nanum Myeongjo', serif",
                color: '#1A1412',
              }}
            >
              {page.title}
            </h2>

            {page.subtitle && (
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#665A54',
                  margin: '0 0 20px 0',
                  fontFamily: "'Nanum Myeongjo', serif",
                }}
              >
                {page.subtitle}
              </h3>
            )}

            {page.content?.map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.75,
                  color: '#3D3531',
                  marginBottom: '14px',
                  fontFamily: "'Nanum Myeongjo', serif",
                  textAlign: 'justify',
                }}
              >
                {paragraph}
              </p>
            ))}

            {page.quote && (
              <blockquote
                style={{
                  margin: '24px 0',
                  padding: '16px 20px',
                  borderLeft: `4px solid ${issue.themeColor}`,
                  backgroundColor: `${issue.themeColor}12`,
                  fontStyle: 'italic',
                  fontSize: '1.05rem',
                  color: '#2C221E',
                  fontFamily: "'Nanum Myeongjo', serif",
                }}
              >
                {page.quote}
              </blockquote>
            )}

            {page.tags && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                {page.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: `${issue.themeColor}22`,
                      color: issue.themeColor,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 푸터 영역 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: isCover || isBack ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
          paddingTop: '12px',
          zIndex: 2,
          fontSize: '0.75rem',
          opacity: 0.6,
        }}
      >
        <span>GONGWON ART & TECH</span>
        <span>1080 × 1350 MAG FORMAT</span>
      </div>
    </div>
  );
}
