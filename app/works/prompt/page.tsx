'use client';

import React, { useState, useRef } from 'react';
import { gsap } from 'gsap';
import BackToMapButton from '../components/BackToMapButton';
import ArchTableView from './components/ArchTableView';
import TableView from './components/TableView';
import { MAGAZINE_ISSUES, getMagazineById } from './data/magazines';

export default function PromptPage() {
  const [viewMode, setViewMode] = useState<'arch' | 'table'>('arch');
  const [selectedIssueId, setSelectedIssueId] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectIssue = (issueId: number) => {
    setSelectedIssueId(issueId);

    // GSAP 부드러운 테이블 줌인/페이드 전환 트랜지션
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.96,
        duration: 0.35,
        ease: 'power2.inOut',
        onComplete: () => {
          setViewMode('table');
          gsap.to(containerRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: 'power2.out',
          });
        },
      });
    } else {
      setViewMode('table');
    }
  };

  const handleBackToArch = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.04,
        duration: 0.35,
        ease: 'power2.inOut',
        onComplete: () => {
          setViewMode('arch');
          gsap.to(containerRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: 'power2.out',
          });
        },
      });
    } else {
      setViewMode('arch');
    }
  };

  const selectedIssue = getMagazineById(selectedIssueId) || MAGAZINE_ISSUES[0];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 지도 맵 복귀 고정 버튼 */}
      <BackToMapButton />

      {/* 메인 화이트 뷰 컨테이너 (아치 테이블 뷰 ↔ e-book 펼침 뷰) */}
      <div ref={containerRef} style={{ width: '100%', minHeight: '100vh' }}>
        {viewMode === 'arch' ? (
          <ArchTableView onSelectIssue={handleSelectIssue} />
        ) : (
          <TableView issue={selectedIssue} onBackToBookshelf={handleBackToArch} />
        )}
      </div>
    </div>
  );
}
