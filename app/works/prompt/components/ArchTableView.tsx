'use client';

import React, { useState } from 'react';
import { MAGAZINE_ISSUES, MagazineIssue } from '../data/magazines';

interface ArchTableViewProps {
  onSelectIssue: (issueId: number) => void;
}

export default function ArchTableView({ onSelectIssue }: ArchTableViewProps) {
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
      {/* 매트 화이트 모노톤 테이블 조명 (Matte Warm Desk Ambient Light) */}
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

      {/* 아치형 매거진 배치 컨테이너 (Arch Arc Magazine Layout) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          height: '520px',
          zIndex: 2,
        }}
      >
        {MAGAZINE_ISSUES.map((issue: MagazineIssue, idx: number) => {
          const total = MAGAZINE_ISSUES.length;
          const mid = (total - 1) / 2; // mid index = 2
          const diff = idx - mid; // -2, -1, 0, 1, 2

          // 아치형 수직/회전 곡선 계산
          const rotateZ = diff * 5.5; // -11deg, -5.5deg, 0deg, 5.5deg, 11deg
          const translateY = Math.pow(Math.abs(diff), 1.7) * 14; // 0px, 14px, 45px
          const translateX = diff * 12; // 수평 조율

          return (
            <ArchMagazineCard
              key={issue.id}
              issue={issue}
              rotateZ={rotateZ}
              translateY={translateY}
              translateX={translateX}
              zIndex={10 - Math.abs(diff)}
              onClick={() => onSelectIssue(issue.id)}
            />
          );
        })}
      </div>

      {/* 테이블 하단 수평 아날로그 소프트 섀도우 (Table Surface Ambient Shadow) */}
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

interface ArchMagazineCardProps {
  issue: MagazineIssue;
  rotateZ: number;
  translateY: number;
  translateX: number;
  zIndex: number;
  onClick: () => void;
}

function ArchMagazineCard({
  issue,
  rotateZ,
  translateY,
  translateX,
  zIndex,
  onClick,
}: ArchMagazineCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '210px',
        margin: '0 -15px', // 아치형 포개짐 수평 간격
        cursor: 'pointer',
        perspective: '1200px',
        zIndex: isHovered ? 50 : zIndex,
        transform: isHovered
          ? `translate(${translateX}px, ${translateY - 32}px) rotate(0deg) scale(1.08)`
          : `translate(${translateX}px, ${translateY}px) rotate(${rotateZ}deg) scale(1)`,
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}
    >
      {/* exact 1080 * 1350 (4:5) 아치형 매거진 커버 카드 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5',
          backgroundColor: issue.coverBg || '#FFFFFF',
          borderRadius: '4px 10px 10px 4px',
          overflow: 'hidden',
          boxShadow: isHovered
            ? '0 32px 64px rgba(0, 0, 0, 0.28), 0 12px 24px rgba(0, 0, 0, 0.18)'
            : '0 16px 36px rgba(0, 0, 0, 0.16), 0 6px 12px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box',
          transition: 'box-shadow 0.35s ease',
        }}
      >
        {issue.coverImage && !imgError ? (
          /* 실제 1080x1350 매거진 이미지 렌더링 */
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

        {/* 표면 하이라이트 종이 광택 (Paper Surface Gloss) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isHovered
              ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 60%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
            transition: 'background 0.3s ease',
          }}
        />

        {/* 좌측 책등 접힘 미세 수직 그림자 (Spine Crease Shadow) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
