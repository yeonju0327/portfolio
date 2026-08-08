'use client';

import React from 'react';
import { MagazineIssue } from '../data/magazines';
import PageFlipReader from './PageFlipReader';

interface TableViewProps {
  issue: MagazineIssue;
  onBackToBookshelf: () => void;
}

export default function TableView({ issue, onBackToBookshelf }: TableViewProps) {
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

      {/* 좌측 상단 "← 매거진 목록으로" 아날로그 버튼 */}
      <button
        onClick={onBackToBookshelf}
        style={{
          position: 'fixed',
          top: '24px',
          left: '260px',
          zIndex: 1000,
          background: '#FFE082',
          color: '#3E2723',
          border: 'none',
          padding: '10px 20px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          fontFamily: "'Nanum Pen Script', cursive",
          boxShadow: '1px 3px 8px rgba(0,0,0,0.15)',
          transform: 'rotate(1deg)',
          borderLeft: '3px solid rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'rotate(-1deg) scale(1.05)';
          e.currentTarget.style.boxShadow = '2px 6px 14px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'rotate(1deg) scale(1)';
          e.currentTarget.style.boxShadow = '1px 3px 8px rgba(0,0,0,0.15)';
        }}
      >
        ← 매거진 목록으로
      </button>

      {/* 매거진 e-book 뷰어 컨테이너 (ArchTableView 560px 높이 뷰 영역과 1:1 수직/수평 위치 정렬) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1300px',
          height: '560px',
          zIndex: 3,
        }}
      >
        <PageFlipReader issue={issue} />
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
