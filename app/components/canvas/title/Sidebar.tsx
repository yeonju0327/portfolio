import React, { useState } from 'react';
import { RAW_TREE } from './data';

interface SidebarProps {
  activeIds: string[];
  onExpandNode: (parentId: string | null, childId: string) => void;
  onMoveCameraOnly: (nodeId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeIds, onExpandNode, onMoveCameraOnly }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });

  const toggleFolder = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // 모든 탭 펼치기 로직
  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    Object.keys(RAW_TREE).forEach(key => {
      if (RAW_TREE[key].children && RAW_TREE[key].children.length > 0) {
        allExpanded[key] = true;
      }
    });
    setExpandedNodes(allExpanded);
  };

  // ✨ 수정: 모든 탭 닫기 시 최상위 헤드 노드(root)까지 빈 객체로 완전히 접히도록 변경
  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const getNodeIcon = (iconType: string, hasChildren: boolean, isActive: boolean) => {
    if (iconType === 'about') return '👤';
    if (iconType === 'skill') return '🛠️';
    if (hasChildren) {
      return isActive ? '📂' : '📁';
    }
    return '💻';
  };

  const renderNodeTree = (nodeId: string, parentId: string | null = null, depth = 0) => {
    const node = RAW_TREE[nodeId];
    if (!node) return null;

    const isActive = activeIds.includes(nodeId);
    const isAvailableCandidate = parentId === null || activeIds.includes(parentId);

    if (!isActive && !isAvailableCandidate) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isFolderExpanded = !!expandedNodes[nodeId];

    const textColor = isActive ? '#2C2C2C' : '#999999';
    const fontWeight = isActive ? 'bold' : 'normal';

    const handleItemClick = () => {
      if (isActive) {
        onMoveCameraOnly(nodeId);
      } else {
        onExpandNode(parentId, nodeId);
        onMoveCameraOnly(nodeId);
        if (hasChildren) {
          setExpandedNodes(prev => ({ ...prev, [nodeId]: true }));
        }
      }
    };

    return (
      <div key={nodeId} style={{ marginLeft: `${depth * 16}px`, userSelect: 'none' }}>
        <div
          onClick={handleItemClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: textColor,
            fontWeight: fontWeight,
            fontSize: '0.95rem',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s, color 0.2s',
          }}
          className="sidebar-item"
        >
          {hasChildren && isActive ? (
            <span
              onClick={(e) => toggleFolder(nodeId, e)}
              style={{
                display: 'inline-block',
                width: '16px',
                transform: isFolderExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                marginRight: '4px',
                fontSize: '0.8rem',
                color: '#666'
              }}
            >
              ▶
            </span>
          ) : (
            <span style={{ display: 'inline-block', width: '16px', marginRight: '4px' }} />
          )}

          <span style={{ marginRight: '6px', fontSize: '1.05rem' }}>
            {getNodeIcon(node.icon, hasChildren, isActive)}
          </span>
          <span>{node.caption}</span>
        </div>

        {hasChildren && isFolderExpanded && isActive && (
          <div style={{ marginTop: '2px', marginBottom: '4px' }}>
            {node.children.map(childId => renderNodeTree(childId, nodeId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 서랍 본체 UI */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-320px',
          width: '320px',
          height: '100vh',
          backgroundColor: '#F5F3ED',
          borderRight: '1px solid #E2DEC9',
          boxShadow: isOpen ? '4px 0 24px rgba(0,0,0,0.05)' : 'none',
          zIndex: 1500,
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 상단 타이틀 영역 */}
        <div style={{ padding: '40px 24px 20px 24px', borderBottom: '1px solid #EAE6D5' }}>
          <h3 style={{ margin: 0, color: '#2C2C2C', fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
            MAP REPOSITORY
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
            인터랙티브 노드 인덱스 탐색기
          </p>
        </div>

        {/* ✨ 수정: 사이드바 맨 위가 아닌, 서랍(리포지토리 트리) 본문 영역 바로 위에 오도록 버튼 컴포넌트 이동 */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0 24px' }}>
          <button className="icon-btn" data-tooltip="모든 탭 펼치기" onClick={handleExpandAll}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button className="icon-btn" data-tooltip="모든 탭 닫기" onClick={handleCollapseAll}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 11 12 6 17 11"></polyline>
              <polyline points="7 18 12 13 17 18"></polyline>
            </svg>
          </button>
        </div>

        {/* 중단 아래 서랍 내부 리포지토리 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px 16px' }}>
          {renderNodeTree('root')}
        </div>
      </div>

      {/* 서랍 제어 핸들 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '50%',
          left: isOpen ? '320px' : '0px',
          transform: 'translateY(-50%)',
          zIndex: 1501,
          width: '24px',
          height: '64px',
          backgroundColor: '#F5F3ED',
          border: '1px solid #E2DEC9',
          borderLeft: 'none', 
          borderRadius: '0 12px 12px 0', 
          cursor: 'pointer',
          boxShadow: '4px 0 12px rgba(0,0,0,0.05)',
          color: '#555555',
          fontSize: '1rem',
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        className="sidebar-toggle-btn"
      >
        <span style={{ 
          display: 'inline-block', 
          transform: isOpen ? 'scaleX(1)' : 'scaleX(-1)', 
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}>
          ◀
        </span>
      </button>

      <style>{`
        .sidebar-item:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        .sidebar-toggle-btn:hover {
          background-color: #EAE6D5;
          color: #2C2C2C;
        }
        .icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid #E2DEC9;
          cursor: pointer;
          color: #888;
          padding: 6px;
          border-radius: 6px;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background-color: #EAE6D5;
          color: #2C2C2C;
          border-color: #D4CEB6;
        }
        .icon-btn::after {
          content: attr(data-tooltip);
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          background-color: #2C2C2C;
          color: #FFFFFF;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 2000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .icon-btn:hover::after {
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default Sidebar;