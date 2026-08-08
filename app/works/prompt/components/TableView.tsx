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
        padding: '80px 20px 40px 20px',
        boxSizing: 'border-box',
        background: 'radial-gradient(circle at 50% 20%, #4A3326 0%, #291C14 60%, #17100B 100%)',
        overflow: 'hidden',
      }}
    >
      {/* 우드 테이블 상판 텍스처 패턴 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 40px, rgba(255,255,255,0.02) 41px, rgba(0,0,0,0.05) 80px),
            radial-gradient(ellipse at 50% 10%, rgba(255, 220, 170, 0.18) 0%, rgba(0,0,0,0) 60%)
          `,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 좌측 상단 "← 책장으로 돌아가기" 아날로그 포스트잇 버튼 */}
      <button
        onClick={onBackToBookshelf}
        style={{
          position: 'fixed',
          top: '24px',
          left: '260px', // Map 버튼과 겹치지 않게 여백 배치
          zIndex: 1000,
          background: '#FFE082',
          color: '#3E2723',
          border: 'none',
          padding: '10px 20px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          fontFamily: "'Nanum Pen Script', cursive",
          boxShadow: '1px 3px 6px rgba(0,0,0,0.2)',
          transform: 'rotate(1deg)',
          borderLeft: '3px solid rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'rotate(-1deg) scale(1.05)';
          e.currentTarget.style.boxShadow = '2px 6px 12px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'rotate(1deg) scale(1)';
          e.currentTarget.style.boxShadow = '1px 3px 6px rgba(0,0,0,0.2)';
        }}
      >
        ← 책장으로 돌아가기
      </button>

      {/* 테이블 위 소품 1: 아날로그 연필 & 메모지 (Desk Prop) */}
      <div
        style={{
          position: 'absolute',
          top: '100px',
          right: '5%',
          width: '140px',
          padding: '16px',
          backgroundColor: '#FFF9C4',
          color: '#333',
          fontFamily: "'Nanum Pen Script', cursive",
          fontSize: '1.1rem',
          boxShadow: '2px 4px 10px rgba(0,0,0,0.3)',
          transform: 'rotate(4deg)',
          pointerEvents: 'none',
          zIndex: 2,
          display: 'none', // @media desktop only or fixed opacity
        }}
      >
        <div>PROMPT Vol.0{issue.vol}</div>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>{issue.issueDate}</div>
      </div>

      {/* 매거진 뷰어 컴포넌트 */}
      <div style={{ zIndex: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PageFlipReader issue={issue} />
      </div>
    </div>
  );
}
