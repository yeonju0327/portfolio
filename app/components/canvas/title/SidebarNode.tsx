import React from 'react';
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
    onExpandNode, onMoveCameraOnly, onNodeDoubleClick, isAutoExploring 
  } = props;
  
  const node = RAW_TREE[nodeId];
  if (!node) return null;

  const isActive = activeIds.includes(nodeId);
  const isAvailableCandidate = parentId === null || activeIds.includes(parentId);

  if (!isActive && !isAvailableCandidate) return null;

  const hasChildren = node.children && node.children.length > 0;
  const isFolderExpanded = !!expandedNodes[nodeId];

  const hash = nodeId.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  const rotation = (Math.sin(hash) * 3.5).toFixed(2);

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
        setTimeout(() => {
          setExpandedNodes(prev => ({ ...prev, [nodeId]: true }));
        }, 50);
      }
    }
  };

  const handleItemDoubleClick = () => {
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
            gridTemplateRows: isFolderExpanded ? '1fr' : '0fr',
            transition: isFolderExpanded 
              ? 'grid-template-rows 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s' 
              : 'grid-template-rows 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0s',
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
                transform: isFolderExpanded ? 'translateY(0)' : 'translateY(-30px)',
                opacity: isFolderExpanded ? 1 : 0,
                transition: isFolderExpanded
                  ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s, opacity 0.1s ease-out 0s'
                  : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0s, opacity 0.1s ease-in 0.4s',
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