import React, { useState } from 'react';
import { RAW_TREE } from './data';

interface SidebarProps {
  activeIds: string[];
  onExpandNode: (parentId: string | null, childId: string, customDelay?: number) => void;
  onMoveCameraOnly: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void; 
  onAutoExplore: () => void; 
  isAutoExploring: boolean; 
}

const lightenColor = (hex: string, factor = 0.85) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgba(255,255,255,0.9)';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  
  return `rgb(${lr}, ${lg}, ${lb})`;
};

const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E")`;

const Sidebar: React.FC<SidebarProps> = ({ activeIds, onExpandNode, onMoveCameraOnly, onNodeDoubleClick, onAutoExplore, isAutoExploring }) => {
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

  const renderSVGIcon = (iconType: string, hasChildren: boolean, isActive: boolean) => {
    const iconStyle = { width: '16px', height: '16px', stroke: 'currentColor', strokeWidth: '1.8', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    
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
          <path d="M22 19a2 2 0 0 1-2-2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
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

    const hash = nodeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rotation = ((hash % 7) - 3) * 0.8; 

    const textColor = isActive ? '#1A1A1A' : '#555555';
    const paperColor = lightenColor(node.color || '#333333', isActive ? 0.82 : 0.9);

    const handleItemClick = () => {
      if (isAutoExploring) return;
      if (isActive) {
        onMoveCameraOnly(nodeId); 
      } else {
        onExpandNode(parentId, nodeId, 1.2);
        onMoveCameraOnly(nodeId);
        if (hasChildren) {
          setExpandedNodes(prev => ({ ...prev, [nodeId]: true }));
        }
      }
    };

    const handleItemDoubleClick = () => {
      if (isAutoExploring) return;
      if (isActive) {
        onNodeDoubleClick(nodeId);
      }
    };

    return (
      <div key={nodeId} style={{ marginLeft: `${depth * 14}px`, marginBottom: '6px' }}>
        <div
          onClick={handleItemClick}
          onDoubleClick={handleItemDoubleClick}
          className="post-it-item"
          style={{
            '--rot': `${rotation}deg`, 
            '--paper-bg': paperColor,
            '--paper-border': `5px solid ${node.color || '#333'}`,
            color: textColor,
            opacity: isAutoExploring ? 0.6 : 1,
            pointerEvents: isAutoExploring ? 'none' : 'auto'
          } as React.CSSProperties}
        >
          {hasChildren && isActive ? (
            <span
              onClick={(e) => toggleFolder(nodeId, e)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                transform: isFolderExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                marginRight: '6px',
                color: '#666'
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', strokeWidth: '2.5', fill: 'none', strokeLinecap: 'round' }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          ) : (
            <span style={{ display: 'inline-block', width: '18px', marginRight: '6px' }} />
          )}

          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', color: textColor }}>
            {renderSVGIcon(node.icon, hasChildren, isActive)}
          </span>
          <span style={{ paddingTop: '2px' }}>{node.caption}</span>
        </div>

        {hasChildren && isFolderExpanded && isActive && (
          <div style={{ marginTop: '6px', marginBottom: '4px' }}>
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
          left: isOpen ? 0 : '-340px', 
          width: '340px',
          height: '100vh',
          backgroundColor: '#F5F3ED',
          backgroundImage: PAPER_TEXTURE,
          borderRight: '1px solid #E2DEC9',
          boxShadow: isOpen ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
          zIndex: 1500,
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Nanum Pen Script', cursive",
        }}
      >
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flag-toggle-container"
          style={{
            position: 'absolute',
            top: '40px',
            right: '-60px', 
            width: '80px', 
            height: '85px',
            cursor: 'pointer',
            zIndex: 1501,
            display: isAutoExploring ? 'none' : 'block'
          }}
        >
          <div className="flag-paper flag-pink" style={{ top: '0px', '--flag-rot': isOpen ? '4deg' : '-2deg' } as React.CSSProperties}>
            <span>INDEX</span>
          </div>
          <div className="flag-paper flag-yellow" style={{ top: '38px', '--flag-rot': isOpen ? '-3deg' : '3deg' } as React.CSSProperties}>
            <span>MAP</span>
          </div>
        </div>

        <div style={{ padding: '44px 28px 24px 28px', borderBottom: '1px dashed #D4CEB6' }}>
          <h3 style={{ margin: 0, color: '#2C2C2C', fontSize: '2.2rem', letterSpacing: '0.02em' }}>
            MAP REPOSITORY
          </h3>
          <p style={{ margin: '6px 0 0 2px', fontSize: '1.2rem', color: '#666' }}>
            인터랙티브 노드 인덱스 탐색기
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '20px 28px 0 28px', position: 'relative', zIndex: 10 }}>
          <button className="icon-btn" data-tooltip="모든 탭 펼치기" onClick={handleExpandAll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button className="icon-btn" data-tooltip="모든 탭 닫기" onClick={handleCollapseAll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 11 12 6 17 11"></polyline>
              <polyline points="7 18 12 13 17 18"></polyline>
            </svg>
          </button>
          <div style={{ width: '2px', backgroundColor: '#E2DEC9', margin: '0 6px' }} />
          <button className="icon-btn" data-tooltip="지도 자동 탐색" onClick={handleTriggerAutoExplore}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 32px 20px', overflowX: 'hidden' }}>
          {renderNodeTree('root')}
        </div>
      </div>

      <style>{`
        /* 토글 플래그 */
        .flag-paper {
          position: absolute;
          left: 0;
          width: 110px; 
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: flex-end; 
          padding-right: 14px; 
          font-size: 1.15rem;
          letter-spacing: 1.5px;
          font-weight: bold;
          color: rgba(0,0,0,0.65);
          background-color: transparent !important; 
          border-radius: 2px 5px 5px 2px;
          transform: rotate(var(--flag-rot));
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: -1; 
        }
        
        .flag-paper::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: inherit;
          background-image: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          border-radius: inherit;
          z-index: -1;
        }

        .flag-paper::after {
          content: '';
          position: absolute;
          top: 0;
          left: 55px; 
          right: 1px;
          bottom: 1px;
          box-shadow: 2px 3px 6px rgba(0,0,0,0.12);
          border-bottom-right-radius: 12px 5px;
          border-top-right-radius: 5px;
          z-index: -2; 
          transition: box-shadow 0.3s, transform 0.3s;
          pointer-events: none;
        }
        
        .flag-pink { --flag-base: #FFB7C5; }
        .flag-yellow { --flag-base: #FFF4A3; }
        .flag-paper.flag-pink::before { background-color: var(--flag-base); }
        .flag-paper.flag-yellow::before { background-color: var(--flag-base); }

        .flag-toggle-container:hover .flag-paper {
          transform: rotate(var(--flag-rot)) translateY(-2px);
        }
        .flag-toggle-container:hover .flag-paper::after {
          box-shadow: 3px 6px 10px rgba(0,0,0,0.16);
          transform: translate(1px, 1px);
        }

        /* 내부 노드 포스트잇 스타일 */
        .post-it-item {
          position: relative;
          display: flex;
          align-items: center;
          padding: 4px 14px;
          font-size: 1.3rem; 
          cursor: pointer;
          user-select: none;
          background-color: transparent !important;
          border-left: none !important;
          transform: rotate(var(--rot));
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 1;
        }

        .post-it-item::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--paper-bg);
          background-image: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
          border-left: var(--paper-border);
          box-shadow: 1px 1px 3px rgba(0,0,0,0.05);
          border-radius: 1px;
          z-index: -1; 
        }

        .post-it-item::after {
          content: '';
          position: absolute;
          bottom: 2px;
          right: 1px;
          width: 70%;
          height: 50%;
          box-shadow: 1px 3px 6px rgba(0, 0, 0, 0.12);
          transform: rotate(2.5deg);
          border-bottom-right-radius: 60% 20%;
          z-index: -2; 
          transition: box-shadow 0.3s, transform 0.3s;
          pointer-events: none;
        }

        .post-it-item:hover {
          transform: rotate(var(--rot)) translateY(-2px);
        }
        
        .post-it-item:hover::after {
          box-shadow: 2px 6px 10px rgba(0, 0, 0, 0.16);
          transform: rotate(3.5deg) translate(1px, 1px);
        }

        /* 아이콘 버튼 스타일 */
        .icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid #D4CEB6;
          color: #777;
          padding: 6px;
          border-radius: 4px;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background-color: rgba(0,0,0,0.03);
          color: #2C2C2C;
          border-color: #A09B7D;
          transform: translateY(-1px);
        }
        
        /* ✨ 툴팁(캡션) 공통 설정: 크기 축소 */
        .icon-btn::after {
          content: attr(data-tooltip);
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          background-color: #2C2C2C;
          color: #FFFFFF;
          padding: 5px 10px; /* 기존 6px 12px에서 축소 */
          border-radius: 4px;
          font-size: 0.95rem; /* 기존 1.1rem에서 축소 */
          font-family: "'Nanum Pen Script', cursive";
          letter-spacing: 1px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 2000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          background-image: ${PAPER_TEXTURE};
        }
        
        /* ✨ 첫 번째 버튼(모든 탭 펼치기): 왼쪽 벽 충돌 방지 */
        .icon-btn:first-of-type::after {
          left: 0;
          transform: translateX(0);
        }
        
        /* ✨ 마지막 버튼(자동 탐색): 오른쪽 벽 충돌 방지 */
        .icon-btn:last-of-type::after {
          left: auto;
          right: 0;
          transform: translateX(0);
        }
        
        .icon-btn:hover::after {
          opacity: 1;
        }

        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(160, 155, 125, 0.3); border-radius: 6px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(160, 155, 125, 0.5); }
      `}</style>
    </>
  );
};

export default Sidebar;