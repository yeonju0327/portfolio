'use client';

import React, { useState, useRef } from 'react';
import { gsap } from 'gsap';
import BackToMapButton from '../components/BackToMapButton';
import BookshelfView from './components/BookshelfView';
import TableView from './components/TableView';
import { MAGAZINE_ISSUES, getMagazineById } from './data/magazines';

export default function PromptPage() {
  const [viewMode, setViewMode] = useState<'bookshelf' | 'table'>('bookshelf');
  const [selectedIssueId, setSelectedIssueId] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectIssue = (issueId: number) => {
    setSelectedIssueId(issueId);

    // GSAP 화면 부드러운 테이블 이동 트랜지션 애니메이션
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          setViewMode('table');
          gsap.to(containerRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'power2.out',
          });
        },
      });
    } else {
      setViewMode('table');
    }
  };

  const handleBackToBookshelf = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.05,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          setViewMode('bookshelf');
          gsap.to(containerRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'power2.out',
          });
        },
      });
    } else {
      setViewMode('bookshelf');
    }
  };

  const selectedIssue = getMagazineById(selectedIssueId) || MAGAZINE_ISSUES[0];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 지도 맵 복귀 고정 버튼 */}
      <BackToMapButton />

      {/* 뷰 컨테이너 (책장 뷰 ↔ 테이블 뷰 전환) */}
      <div ref={containerRef} style={{ width: '100%', minHeight: '100vh' }}>
        {viewMode === 'bookshelf' ? (
          <BookshelfView onSelectIssue={handleSelectIssue} />
        ) : (
          <TableView issue={selectedIssue} onBackToBookshelf={handleBackToBookshelf} />
        )}
      </div>
    </div>
  );
}
