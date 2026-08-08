'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MagazineIssue, MagazinePage } from '../data/magazines';
import { soundManager } from './SoundManager';

interface PageFlipReaderProps {
  issue: MagazineIssue;
}

export default function PageFlipReader({ issue }: PageFlipReaderProps) {
  // 현재 펼쳐진 페이지 인덱스 (0: 1페이지부터 시작)
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

    let start: number | null = null;
    const duration = 450; // ms

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
    const duration = 450;

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

  // 키보드 방향키 조작
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
          backgroundColor: '#1A1614',
          borderRadius: '4px 12px 12px 4px',
          boxShadow: `
            0 25px 50px rgba(0, 0, 0, 0.65),
            0 10px 20px rgba(0, 0, 0, 0.4),
            inset 0 0 100px rgba(0, 0, 0, 0.1)
          `,
          perspective: '1500px',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* 현재 베이스 페이지 */}
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 10,
              backgroundColor: '#1A1614',
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
                  rgba(0,0,0,${Math.sin(flipProgress * Math.PI) * 0.45}) 0%, 
                  rgba(255,255,255,${Math.sin(flipProgress * Math.PI) * 0.15}) 50%, 
                  rgba(0,0,0,${Math.sin(flipProgress * Math.PI) * 0.35}) 100%)`,
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
            background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />

        {/* 좌우 종이 넘기기 터치 핫스팟 */}
        <div
          onClick={handlePrevPage}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '25%',
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
            width: '25%',
            height: '100%',
            cursor: currentPageIndex < totalPages - 1 ? 'pointer' : 'default',
            zIndex: 6,
          }}
          title="다음 페이지 (▶)"
        />
      </div>

      {/* 매거진 조작 하단 대시보드 */}
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
            (클릭 시 확대 감상)
          </span>
        </div>

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

      {/* 페이지 세부 확대 모달 */}
      {zoomPage && (
        <div
          onClick={() => setZoomPage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxHeight: '90vh',
              aspectRatio: '4 / 5',
              backgroundColor: '#1A1614',
              borderRadius: '8px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.9)',
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
                background: 'rgba(0,0,0,0.7)',
                color: '#FFF',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '400px',
                maxHeight: '40px',
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

interface PageGraphicProps {
  page: MagazinePage;
  issue: MagazineIssue;
  onClick?: () => void;
}

function PageGraphic({ page, issue, onClick }: PageGraphicProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1614',
        cursor: onClick ? 'zoom-in' : 'default',
        overflow: 'hidden',
      }}
    >
      {page.imageUrl && !imgError ? (
        /* 실제 고해상도 매거진 이미지 렌더링 */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        /* 폴백 그래픽 렌더링 */
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '40px 36px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#FAF3E0',
          }}
        >
          <div>
            <h3>Page {page.pageNumber}</h3>
          </div>
        </div>
      )}
    </div>
  );
}
