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
          const total = MAGAZINE_ISSUES.length;
          const mid = (total - 1) / 2; // mid index = 2
          const diff = idx - mid; // -2, -1, 0, 1, 2

          // 완만한 아치형 수직/회전 곡선 계산
          const rotateZ = diff * 5.5; // -11deg, -5.5deg, 0deg, 5.5deg, 11deg
          const translateY = Math.pow(Math.abs(diff), 1.7) * 14;
          const translateX = diff * 10;

          // 레이어 순서: 왼쪽(idx=0)이 가장 위, 오른쪽으로 갈수록 아래로 포개짐
          const zIndex = (total - idx) * 10;

          return (
            <ArchMagazineCard
              key={issue.id}
              issue={issue}
              rotateZ={rotateZ}
              translateY={translateY}
              translateX={translateX}
              zIndex={zIndex}
              onClick={() => onSelectIssue(issue.id)}
            />
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
        width: '265px',
        margin: '0 -22px',
        cursor: 'pointer',
        perspective: '1200px',
        zIndex: zIndex,
        transformOrigin: 'bottom center',
        transform: isHovered
          ? `translate(${translateX}px, ${translateY}px) rotate(${rotateZ}deg) scale(1.08)`
          : `translate(${translateX}px, ${translateY}px) rotate(${rotateZ}deg) scale(1)`,
        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
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
            ? '0 28px 56px rgba(0, 0, 0, 0.22), 0 10px 20px rgba(0, 0, 0, 0.14)'
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
