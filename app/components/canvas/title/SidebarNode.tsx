import React, { useState, useEffect } from 'react';
import { RAW_TREE } from './data';
import { SidebarIcon } from './SidebarIcons';

interface SidebarNodeProps {
  nodeId: string;
  parentId: string | null;
  depth: number;
  activeIds: string[];
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onExpandNode: (parentId: string | null, childId: string, customDelay?: number) => void;
  onMoveCameraOnly: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  isAutoExploring: boolean;
  triggerMovementShield: () => void; // ✨ 상위 쉴드 함수 수신
}

export const lightenColor = (hex: string, factor = 0.85) => {
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

const SidebarNode: React.FC<SidebarNodeProps> = (props) => {
  const { 
    nodeId, parentId, depth, activeIds, expandedNodes, setExpandedNodes, 
    onExpandNode, onMoveCameraOnly, onNodeDoubleClick, isAutoExploring, triggerMovementShield
  } = props;
  
  const node = RAW_TREE[nodeId];
  if (!node) return null;

  const isActive = activeIds.includes(nodeId);
  const isAvailableCandidate = parentId === null || activeIds.includes(parentId);

  if (!isActive && !isAvailableCandidate) return null;

  const hasChildren = node.children && node.children.length > 0;
  const isFolderExpanded = !!expandedNodes[nodeId];
  
  const shouldBeOpen = isActive && isFolderExpanded;
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (shouldBeOpen) {
      let frame2: number;
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return () => {
        cancelAnimationFrame(frame1);
        if (frame2) cancelAnimationFrame(frame2);
      };
    } else {
      setIsAnimating(false);
    }
  }, [shouldBeOpen]);

  const hash = nodeId.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  const rotation = (Math.sin(hash) * 3.5).toFixed(2);

  const textColor = isActive ? '#1A1A1A' : '#555555';
  const paperColor = lightenColor(node.color || '#333333', isActive ? 0.82 : 0.9);

  // ✨ 싱글 클릭 처리: 오직 카메라 무빙만 일으키며 무빙 쉴드를 함께 가동시킵니다.
  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAutoExploring) return;
    
    if (isActive) {
      onMoveCameraOnly(nodeId); 
      triggerMovementShield(); // 1.2초간 완벽 격리막 작동
    } else {
      onExpandNode(parentId, nodeId, 1.2);
      onMoveCameraOnly(nodeId);
      triggerMovementShield(); // 확장 이동 시에도 완벽 격리막 작동
      if (hasChildren) {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: true }));
      }
    }
  };

  // ✨ 더블 클릭 처리: 클릭 판정(대시보드 등)을 전달합니다.
  const handleItemDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAutoExploring) return;
    if (isActive) {
      onNodeDoubleClick(nodeId);
    }
  };

  const toggleFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div style={{ marginLeft: `${depth * 14}px`, marginBottom: '6px' }}>
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
          pointerEvents: isAutoExploring ? 'none' : 'auto',
          position: 'relative', 
          zIndex: 2
        } as React.CSSProperties}
      >
        {hasChildren && isActive ? (
          <span onClick={toggleFolder} className="folder-toggle-btn">
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '18px', height: '18px',
                transform: isFolderExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s', color: '#666'
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', strokeWidth: '2.5', fill: 'none', strokeLinecap: 'round' }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </span>
        ) : (
          <span style={{ display: 'inline-block', width: '18px', marginRight: '6px' }} />
        )}

        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', color: textColor }}>
          <SidebarIcon iconType={node.icon} hasChildren={hasChildren} isActive={isActive} />
        </span>
        <span style={{ paddingTop: '2px' }}>{node.caption}</span>
      </div>

      {hasChildren && isActive && (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: isAnimating ? '1fr' : '0fr',
            transitionProperty: 'grid-template-rows',
            transitionDuration: '0.4s',
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            position: 'relative',
            zIndex: 1, 
            marginTop: '-4px', 
          }}
        >
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            <div
              style={{
                paddingTop: '8px',
                marginBottom: '4px',
                transform: isAnimating ? 'translateY(0)' : 'translateY(-20px)',
                opacity: isAnimating ? 1 : 0,
                transitionProperty: 'transform, opacity',
                transitionDuration: '0.4s, 0.3s',
                transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1), ease',
                transitionDelay: isAnimating ? '0.1s, 0s' : '0s, 0.15s',
              }}
            >
              {node.children.map(childId => (
                <SidebarNode 
                  key={childId} 
                  {...props} 
                  nodeId={childId} 
                  parentId={nodeId} 
                  depth={depth + 1} 
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarNode;