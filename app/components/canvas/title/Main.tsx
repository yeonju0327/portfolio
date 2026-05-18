'use client'; 

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';
import NodePlaceholder from './NodePlaceholder';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar'; 
import { useInfiniteCanvas } from '../../../hooks/useInfiniteCanvas'; 
import { PORTFOLIO_MAP, CENTER, MapData } from './data';
import { getEdgePoints } from './utils';

const VIRTUAL_SIZE = 4000;

const Main = () => {
  const [isClient, setIsClient] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [links, setLinks] = useState<{source: string, target: string, delay: number}[]>([]);
  const [fadingIds, setFadingIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<MapData[string] | null>(null);
  const [dashboardPos, setDashboardPos] = useState<'left' | 'right' | 'top' | null>(null);

  const { viewport, isReady, isDraggingActive, handleMouseDown, moveCamera } = useInfiniteCanvas(VIRTUAL_SIZE);

  useEffect(() => { setIsClient(true); }, []);

  const activeNodes = useMemo(() => activeIds.map(id => PORTFOLIO_MAP[id]), [activeIds]);

  const handleExpandNode = useCallback((parentId: string | null, childId: string) => {
    if (activeIds.includes(childId) || fadingIds.includes(childId)) return;
    setActiveIds(prev => [...prev, childId]);
    if (parentId) setLinks(prev => [...prev, { source: parentId, target: childId, delay: 0 }]); 
    
    setFadingIds(prev => [...prev, childId]);
    setTimeout(() => { setFadingIds(prev => prev.filter(id => id !== childId)); }, 3500);
  }, [activeIds, fadingIds]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    const targetScreenPoint = { x: window.innerWidth * 0.32, y: window.innerHeight / 2 };
    const pos = 'right';

    setSelectedNode(node);
    setDashboardPos(pos);
    moveCamera(node.x, node.y, targetScreenPoint);
  }, [moveCamera]);

  // ✨ 수정: 사이드바 탐색 시, 사이드바의 가로 너비(320px)를 제외한 나머지 영역의 정중앙에 카메라를 위치시킴
  const handleMoveCameraOnly = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    const sidebarWidth = 320;
    const availableWidth = window.innerWidth - sidebarWidth;
    
    // 사이드바 영역 + (남은 영역의 절반) = 가시적인 화면의 정확한 중앙
    const centerScreenPoint = { 
      x: sidebarWidth + (availableWidth / 2), 
      y: window.innerHeight / 2 
    };
    
    moveCamera(node.x, node.y, centerScreenPoint);
  }, [moveCamera]);

  const handleCloseDashboard = () => {
    setSelectedNode(null);
    setDashboardPos(null);
  };

  if (!isClient || !isReady) return null;

  return (
    <>
      <div onMouseDown={handleMouseDown} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5', position: 'relative', userSelect: 'none' }}>
        <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
          <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {activeNodes.map(node => ( <InkFilter key={`filter-${node.id}`} id={node.id} /> ))}
        </svg>

        <div style={{ position: 'absolute', width: VIRTUAL_SIZE, height: VIRTUAL_SIZE, transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: 'url(/background-image.jpg)', backgroundRepeat: 'repeat' }} />
          
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', filter: 'url(#crayon-texture)', zIndex: 10 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}><Layer>
              {links.map((link, idx) => {
                const s = PORTFOLIO_MAP[link.source], t = PORTFOLIO_MAP[link.target];
                if (!s || !t) return null;
                const { startX, startY, endX, endY } = getEdgePoints(s, t);
                return <Branch key={`branch-${idx}`} startX={startX} startY={startY} endX={endX} endY={endY} startColor={s.color || '#333'} endColor={t.color || '#333'} delay={link.delay} />;
              })}
            </Layer></Stage>
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
            {(!activeIds.includes('root') || fadingIds.includes('root')) && (
              <div style={{ position: 'absolute', left: PORTFOLIO_MAP.root.x - 55, top: PORTFOLIO_MAP.root.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                <Stage width={110} height={110}><Layer listening={!isDraggingActive && !fadingIds.includes('root')}>
                  <NodePlaceholder x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} iconType={PORTFOLIO_MAP.root.icon} targetDelay={0} onClick={() => handleExpandNode(null, 'root')} isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive} />
                </Layer></Stage>
              </div>
            )}
            {activeNodes.map(parentNode => parentNode.children.map(childId => {
              const targetData = PORTFOLIO_MAP[childId];
              if (!targetData || (activeIds.includes(childId) && !fadingIds.includes(childId))) return null;
              return (
                <div key={`placeholder-${childId}`} style={{ position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                  <Stage width={110} height={110}><Layer listening={!isDraggingActive && !fadingIds.includes(childId)}>
                    <NodePlaceholder x={55} y={55} color={targetData.color || '#333333'} iconType={targetData.icon} targetDelay={1.8} onClick={() => handleExpandNode(parentNode.id, childId)} isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive} />
                  </Layer></Stage>
                </div>
              );
            }))}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
            {activeNodes.map(node => {
              const size = node.size ?? 85, STAGE_SIZE = size * 5;
              return (
                <div key={`spread-${node.id}`} style={{ position: 'absolute', left: node.x - STAGE_SIZE/2, top: node.y - STAGE_SIZE/2, width: STAGE_SIZE, height: STAGE_SIZE, pointerEvents: 'none' }}>
                  <InkSpread {...node} size={size} stageSize={STAGE_SIZE} x={STAGE_SIZE/2} y={STAGE_SIZE/2} onNodeClick={handleNodeClick} isDraggingActive={isDraggingActive} isSelected={selectedNode?.id === node.id} />
                </div>
              );
            })}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}><Layer>
              {activeNodes.map(node => ( <InkDrop key={`drop-${node.id}`} {...node} /> ))}
            </Layer></Stage>
          </div>
        </div>
      </div>

      <Sidebar 
        activeIds={activeIds} 
        onExpandNode={handleExpandNode} 
        onMoveCameraOnly={handleMoveCameraOnly} 
      />

      <Dashboard selectedNode={selectedNode} dashboardPos={dashboardPos} onClose={handleCloseDashboard} />
    </>
  );
};

export default Main;