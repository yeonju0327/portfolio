import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // ✨ [성능 최적화 #8] Hooks 규칙 위반 수정: useState/useRef/useEffect를 최상단으로 이동
  // 이전에는 early return이 hooks 선언 앞에 있어 React Rules of Hooks 위반이었음
  const node = RAW_TREE[nodeId];

  const hasChildren = node ? (node.children && node.children.length > 0) : false;
  const isFolderExpanded = !!expandedNodes[nodeId];
  const isActive = activeIds.includes(nodeId);
  const isAvailableCandidate = parentId === null || activeIds.includes(parentId);
  const shouldBeOpen = isActive && isFolderExpanded;

  const [isAnimating, setIsAnimating] = useState(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✨ [성능 최적화 #17] hash를 useMemo로 캐싱 → nodeId는 고정값이므로 리렌더링마다 재계산 불필요
  const rotation = useMemo(() => {
    const hash = nodeId.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
    return (Math.sin(hash) * 3.5).toFixed(2);
  }, [nodeId]);

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

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // ✨ [성능 최적화 #8] early return을 hooks 선언 이후로 이동 (Hooks 규칙 위반 해소)
  if (!node) return null;
  if (!isActive && !isAvailableCandidate) return null;

  const textColor = isActive ? '#1A1A1A' : '#555555';
  const paperColor = lightenColor(node.color || '#333333', isActive ? 0.82 : 0.9);


  // ✨ 싱글 클릭 처리: 250ms 대기하여 더블클릭 판정이 아닐 경우에만 이동 및 쉴드 발동
  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAutoExploring) return;
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
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
      clickTimeoutRef.current = null;
    }, 250);
  };

  // ✨ 더블 클릭 처리: 클릭 타이머를 파기하고, 캔버스 노드 클릭(대시보드 오픈) 판정을 전달
  const handleItemDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAutoExploring) return;

    // 대기 중이던 싱글 클릭 로직 취소
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (isActive) {
      onNodeDoubleClick(nodeId);
      triggerMovementShield(); // ✨ 카메라가 대상 노드 중앙으로 이동하므로 쉴드 방어막 동시 가동
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