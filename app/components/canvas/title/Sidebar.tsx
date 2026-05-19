import React, { useState } from 'react';
import { RAW_TREE } from './data';

interface SidebarProps {
  activeIds: string[];
  onExpandNode: (parentId: string | null, childId: string) => void;
  onMoveCameraOnly: (nodeId: string) => void;
  onAutoExplore: () => void; 
  isAutoExploring: boolean; 
}

// ✨ 노드 컬러 그라데이션용 헬퍼
const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
};

// ✨ 사이드바 전반에 적용될 은은한 종이 질감(Noise) 패턴
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E")`;

const Sidebar: React.FC<SidebarProps> = ({ activeIds, onExpandNode, onMoveCameraOnly, onAutoExplore, isAutoExploring }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });

  const toggleFolder = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleExpandAll = () => {
    if (isAutoExploring) return;
    const allExpanded: Record<string, boolean> = {};
    Object.keys(RAW_TREE).forEach(key => {
      if (RAW_TREE[key].children && RAW_TREE[key].children.length > 0) {
        allExpanded[key] = true;
      }
    });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    if (isAutoExploring) return;
    setExpandedNodes({});
  };

  const handleTriggerAutoExplore = () => {
    if (isAutoExploring) return;
    setIsOpen(false);
    onAutoExplore();
  };

  // ✨ 이모지를 대체하는 깔끔한 라인 드로잉 SVG 아이콘 렌더러 (지터 미사용)
  const renderSVGIcon = (iconType: string, hasChildren: boolean, isActive: boolean) => {
    const iconStyle = { width: '16px', height: '16px', stroke: 'currentColor', strokeWidth: '1.5', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    
    if (iconType === 'about') return (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    );
    if (iconType === 'skill') return (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
    if (hasChildren) {
      return isActive ? (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <path d="M2 19V5a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v1M2 19h20M2 19l2-8h18l-2 8H4z"></path>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    );
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
    
    const rgbStr = hexToRgb(node.color || '#333333');

    const handleItemClick = () => {
      if (isAutoExploring) return;
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
      <div key={nodeId} style={{ marginLeft: `${depth * 8}px`, userSelect: 'none', marginBottom: '2px' }}>
        <div
          onClick={handleItemClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: '0 6px 6px 0',
            cursor: isAutoExploring ? 'not-allowed' : 'pointer',
            opacity: isAutoExploring ? 0.6 : 1,
            color: textColor,
            fontWeight: fontWeight,
            fontSize: '0.95rem',
            backgroundImage: isActive ? `linear-gradient(90deg, rgba(${rgbStr}, 0.25) 0%, rgba(${rgbStr}, 0) 35%)` : 'none',
            borderLeft: isActive ? `3px solid ${node.color}` : '3px solid transparent',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s, color 0.2s, opacity 0.3s',
            pointerEvents: isAutoExploring ? 'none' : 'auto'
          }}
          className="sidebar-item"
        >
          {/* ✨ 텍스트 화살표(▶)를 대체하는 SVG 쉐브론 */}
          {hasChildren && isActive ? (
            <span
              onClick={(e) => toggleFolder(nodeId, e)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                transform: isFolderExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                marginRight: '4px',
                color: '#666'
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', strokeWidth: '2', fill: 'none' }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          ) : (
            <span style={{ display: 'inline-block', width: '16px', marginRight: '4px' }} />
          )}

          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
            {renderSVGIcon(node.icon, hasChildren, isActive)}
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
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-320px',
          width: '320px',
          height: '100vh',
          backgroundColor: '#F5F3ED',
          // ✨ 사이드바 전반에 종이 질감 패턴 주입
          backgroundImage: PAPER_TEXTURE,
          borderRight: '1px solid #E2DEC9',
          boxShadow: isOpen ? '4px 0 24px rgba(0,0,0,0.05)' : 'none',
          zIndex: 1500,
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '40px 24px 20px 24px', borderBottom: '1px solid #EAE6D5' }}>
          <h3 style={{ margin: 0, color: '#2C2C2C', fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
            MAP REPOSITORY
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
            인터랙티브 노드 인덱스 탐색기
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0 24px' }}>
          <button className="icon-btn" data-tooltip="모든 탭 펼치기" onClick={handleExpandAll} style={{ opacity: isAutoExploring ? 0.4 : 1, cursor: isAutoExploring ? 'not-allowed' : 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button className="icon-btn" data-tooltip="모든 탭 닫기" onClick={handleCollapseAll} style={{ opacity: isAutoExploring ? 0.4 : 1, cursor: isAutoExploring ? 'not-allowed' : 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 11 12 6 17 11"></polyline>
              <polyline points="7 18 12 13 17 18"></polyline>
            </svg>
          </button>
          <div style={{ width: '1px', backgroundColor: '#E2DEC9', margin: '0 4px' }} />
          <button className="icon-btn" data-tooltip="지도 자동 탐색" onClick={handleTriggerAutoExplore} style={{ opacity: isAutoExploring ? 0.4 : 1, cursor: isAutoExploring ? 'not-allowed' : 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px 16px' }}>
          {renderNodeTree('root')}
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '50%',
          left: isOpen ? '320px' : '0px',
          transform: 'translateY(-50%)',
          zIndex: 1501,
          width: '26px', 
          height: '64px',
          backgroundColor: '#2C2C2C', 
          // ✨ 토글 버튼에도 미세한 질감을 넣어 아날로그 느낌 통일
          backgroundImage: PAPER_TEXTURE,
          border: '1px solid #2C2C2C',
          borderLeft: 'none', 
          borderRadius: '0 12px 12px 0', 
          cursor: 'pointer',
          boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
          color: '#FFFFFF', 
          opacity: isAutoExploring ? 0 : 1,
          pointerEvents: isAutoExploring ? 'none' : 'auto',
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, opacity 0.4s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        className="sidebar-toggle-btn"
      >
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center',
          justifyContent: 'center',
          transform: isOpen ? 'scaleX(-1)' : 'scaleX(1)', 
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}>
          {/* ✨ 텍스트 화살표(◀)를 대체하는 깔끔한 형태의 SVG 쉐브론 */}
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', strokeWidth: '2.5', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      </button>

      <style>{`
        .sidebar-item:hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        .sidebar-toggle-btn:hover {
          background-color: #1A1A1A !important;
          border-color: #1A1A1A !important;
        }
        .icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid #E2DEC9;
          color: #888;
          padding: 6px;
          border-radius: 6px;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background-color: rgba(0,0,0,0.04);
          color: #2C2C2C;
          border-color: #D4CEB6;
        }
        .icon-btn::after {
          content: attr(data-tooltip);
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
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
          /* 툴팁에도 종이 질감 연장 적용 */
          background-image: ${PAPER_TEXTURE};
        }
        .icon-btn:hover::after {
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default Sidebar;