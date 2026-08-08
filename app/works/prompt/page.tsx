'use client';

import React, { useState } from 'react';
import BackToMapButton from '../components/BackToMapButton';
import ArchTableView from './components/ArchTableView';
import TableView from './components/TableView';
import { MAGAZINE_ISSUES, getMagazineById } from './data/magazines';

export default function PromptPage() {
  const [viewMode, setViewMode] = useState<'arch' | 'table'>('arch');
  const [selectedIssueId, setSelectedIssueId] = useState<number>(1);
  const [lastSelectedIssueId, setLastSelectedIssueId] = useState<number | null>(null);

  const handleSelectIssue = (issueId: number) => {
    setSelectedIssueId(issueId);
    setLastSelectedIssueId(issueId);
    setViewMode('table');
  };

  const handleBackToArch = () => {
    setViewMode('arch');
  };

  const selectedIssue = getMagazineById(selectedIssueId) || MAGAZINE_ISSUES[0];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 지도 맵 복귀 고정 버튼 */}
      <BackToMapButton />

      {/* 메인 화이트 뷰 컨테이너 (아치 테이블 뷰 ↔ e-book 펼침 뷰) */}
      <div style={{ width: '100%', minHeight: '100vh' }}>
        {viewMode === 'arch' ? (
          <ArchTableView
            onSelectIssue={handleSelectIssue}
            lastSelectedIssueId={lastSelectedIssueId}
          />
        ) : (
          <TableView issue={selectedIssue} onBackToBookshelf={handleBackToArch} />
        )}
      </div>
    </div>
  );
}

