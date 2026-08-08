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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px 40px 20px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 30%, #E3E2DC 0%, #D4D2CB 60%, #C5C3BB 100%)',
        overflow: 'hidden',
      }}
    >
      {/* 스튜디오 상판 은은한 조명 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, 0.45) 0%, rgba(227, 226, 220, 0) 70%)',
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

      {/* 매거진 e-book 뷰어 컴포넌트 */}
      <div style={{ zIndex: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PageFlipReader issue={issue} />
      </div>
    </div>
  );
}
