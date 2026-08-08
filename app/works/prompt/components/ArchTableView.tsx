'use client';

import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { MAGAZINE_ISSUES, MagazineIssue } from '../data/magazines';
import { soundManager } from './SoundManager';

interface ArchTableViewProps {
  onSelectIssue: (issueId: number) => void;
  lastSelectedIssueId?: number | null;
}

export default function ArchTableView({
  onSelectIssue,
  lastSelectedIssueId = null,
}: ArchTableViewProps) {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimatingRef = useRef(false);

  // 각 매거진 카드의 아치형 기본 좌표 및 회전각 계산
  const getArchParams = (idx: number) => {
    const total = MAGAZINE_ISSUES.length;
    const mid = (total - 1) / 2; // 2
    const diff = idx - mid; // -2, -1, 0, 1, 2
    const baseRotate = diff * 5.5; // -11deg, -5.5deg, 0deg, 5.5deg, 11deg
    const baseY = Math.pow(Math.abs(diff), 1.7) * 14; // 수직 곡선 오프셋
    const baseX = diff * 10; // 수평 곡선 오프셋
    const zIndex = (total - idx) * 10;
    return { diff, baseRotate, baseY, baseX, zIndex };
  };

  // e-book에서 아치 뷰로 돌아올 때 역방향 복원 애니메이션 연출
  useEffect(() => {
    if (lastSelectedIssueId === null) return;

    const lastIdx = MAGAZINE_ISSUES.findIndex(issue => issue.id === lastSelectedIssueId);
    if (lastIdx === -1) return;

    isAnimatingRef.current = true;

    // 초기 위치 설정 (이탈되었던 위치에서 출발)
    cardsRef.current.forEach((cardEl, idx) => {
      if (!cardEl) return;
      const { baseRotate, baseY, baseX } = getArchParams(idx);
      if (idx < lastIdx) {
        gsap.set(cardEl, { x: '-100vw', y: baseY + 40, rotation: baseRotate - 15, opacity: 0 });
      } else if (idx > lastIdx) {
        gsap.set(cardEl, { x: '100vw', y: baseY + 40, rotation: baseRotate + 15, opacity: 0 });
      } else {
        gsap.set(cardEl, { x: 0, y: 0, scale: 1.35, rotation: 0, opacity: 1, zIndex: 100 });
      }
    });

    // 복원 타임라인 실행
    const tl = gsap.timeline({
      onComplete: () => {
        cardsRef.current.forEach((cardEl, idx) => {
          if (!cardEl) return;
          const { zIndex } = getArchParams(idx);
          gsap.set(cardEl, { zIndex });
        });
        isAnimatingRef.current = false;
      },
    });

    cardsRef.current.forEach((cardEl, idx) => {
      if (!cardEl) return;
      const { baseRotate, baseY, baseX } = getArchParams(idx);
      tl.to(
        cardEl,
        {
          x: baseX,
          y: baseY,
          scale: 1,
          rotation: baseRotate,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
        },
        0
      );
    });
  }, [lastSelectedIssueId]);

  // 첫 진입 시 기본 아치 배치
  useEffect(() => {
    if (lastSelectedIssueId !== null) return;
    cardsRef.current.forEach((cardEl, idx) => {
      if (!cardEl) return;
      const { baseRotate, baseY, baseX } = getArchParams(idx);
      gsap.set(cardEl, {
        x: baseX,
        y: baseY,
        rotation: baseRotate,
        scale: 1,
        opacity: 1,
      });
    });
  }, [lastSelectedIssueId]);

  // 클릭 시 표지별 스와이프 이탈 및 선택 표지 중앙 확대
  const handleSelectCard = (issue: MagazineIssue, selectedIdx: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    soundManager.playPaperTurn();

    const tl = gsap.timeline({
      onComplete: () => {
        onSelectIssue(issue.id);
      },
    });

    cardsRef.current.forEach((cardEl, idx) => {
      if (!cardEl) return;
      const { baseRotate, baseY } = getArchParams(idx);

      if (idx < selectedIdx) {
        // 선택한 표지보다 왼쪽에 있는 표지들: 왼쪽 밖으로 스와이프 이탈
        tl.to(
          cardEl,
          {
            x: '-120vw',
            y: baseY + 50,
            rotation: baseRotate - 15,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          },
          0
        );
      } else if (idx > selectedIdx) {
        // 선택한 표지보다 오른쪽에 있는 표지들: 오른쪽 밖으로 스와이프 이탈
        tl.to(
          cardEl,
          {
            x: '120vw',
            y: baseY + 50,
            rotation: baseRotate + 15,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          },
          0
        );
      } else {
        // 선택한 표지: zIndex 최상단, 화면 중앙으로 이동 및 확대
        gsap.set(cardEl, { zIndex: 100 });
        tl.to(
          cardEl,
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1.35,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
          },
          0
        );
      }
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 40%, #EFEFEA 0%, #E4E3DD 60%, #D8D7D1 100%)',
        overflow: 'hidden',
      }}
    >
      {/* 테이블 은은한 스튜디오 모노톤 조명 */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '75%',
          height: '450px',
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45) 0%, rgba(228, 227, 221, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 아치형 직사각형 매거진 이미지 배치 컨테이너 */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1300px',
          height: '560px',
          zIndex: 2,
        }}
      >
        {MAGAZINE_ISSUES.map((issue: MagazineIssue, idx: number) => {
          const { zIndex } = getArchParams(idx);

          return (
            <div
              key={issue.id}
              ref={(el) => {
                cardsRef.current[idx] = el;
              }}
              style={{
                position: 'relative',
                width: '265px',
                margin: '0 -22px',
                cursor: 'pointer',
                perspective: '1200px',
                zIndex: zIndex,
                willChange: 'transform, opacity',
              }}
            >
              <ArchMagazineCardInner
                issue={issue}
                onClick={() => handleSelectCard(issue, idx)}
              />
            </div>
          );
        })}
      </div>

      {/* 테이블 하단 소프트 섀도우 */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: '1000px',
          height: '50px',
          background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 75%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

interface ArchMagazineCardInnerProps {
  issue: MagazineIssue;
  onClick: () => void;
}

function ArchMagazineCardInner({ issue, onClick }: ArchMagazineCardInnerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        transformOrigin: 'bottom center', // 아래쪽 축 고정 (아래방향 확대 방지, 위쪽으로만 확장)
        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)', // '쭈욱' 늘어나는 0.6초 이징 커브
        willChange: 'transform',
      }}
    >
      {/* 깔끔한 직사각형 1080 * 1350 (4:5) 이미지 카드 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5',
          backgroundColor: issue.coverBg || '#FFFFFF',
          borderRadius: '0px',
          overflow: 'hidden',
          boxShadow: isHovered
            ? '0 30px 60px rgba(0, 0, 0, 0.25), 0 12px 24px rgba(0, 0, 0, 0.16)'
            : '0 16px 36px rgba(0, 0, 0, 0.16), 0 6px 12px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box',
          transition: 'box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {issue.coverImage && !imgError ? (
          /* 실제 1080x1350 직사각형 이미지 렌더링 */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={issue.coverImage}
            alt={`PROMPT Vol.${issue.vol}`}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              borderRadius: '0px',
            }}
          />
        ) : (
          /* 폴백 렌더링 */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: issue.themeColor,
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '1.5rem',
            }}
          >
            VOL.0{issue.vol}
          </div>
        )}
      </div>
    </div>
  );
}
