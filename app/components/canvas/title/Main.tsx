'use client'; 

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { gsap } from 'gsap'; 
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';
import NodePlaceholder from './NodePlaceholder';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar'; 
import { useInfiniteCanvas } from '../../../hooks/useInfiniteCanvas'; 
import { PORTFOLIO_MAP, CENTER, MapData, RAW_TREE } from './data';
import { getEdgePoints } from './utils';

const VIRTUAL_SIZE = 4000;

const Main = () => {
  const [isClient, setIsClient] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [links, setLinks] = useState<{source: string, target: string, delay: number}[]>([]);
  const [fadingIds, setFadingIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<MapData[string] | null>(null);
  const [dashboardPos, setDashboardPos] = useState<'left' | 'right' | 'top' | null>(null);
  
  const [isAutoExploring, setIsAutoExploring] = useState(false);

  const { viewport, setViewport, isReady, isDraggingActive, handleMouseDown, moveCamera } = useInfiniteCanvas(VIRTUAL_SIZE);

  useEffect(() => { setIsClient(true); }, []);

  const activeNodes = useMemo(() => activeIds.map(id => PORTFOLIO_MAP[id]), [activeIds]);

  const handleExpandNode = useCallback((parentId: string | null, childId: string) => {
    setActiveIds(prev => {
      if (prev.includes(childId)) return prev;

      if (parentId) {
        setLinks(prevLinks => [...prevLinks, { source: parentId, target: childId, delay: 0 }]);
      }
      
      setFadingIds(prevFading => [...prevFading, childId]);
      setTimeout(() => { 
        setFadingIds(currentFading => currentFading.filter(id => id !== childId)); 
      }, 3500);

      return [...prev, childId];
    });
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    const targetScreenPoint = { x: window.innerWidth * 0.32, y: window.innerHeight / 2 };
    const pos = 'right';

    setSelectedNode(node);
    setDashboardPos(pos);
    moveCamera(node.x, node.y, targetScreenPoint);
  }, [moveCamera]);

  const handleMoveCameraOnly = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    const sidebarWidth = 320;
    const availableWidth = window.innerWidth - sidebarWidth;
    const centerScreenPoint = { 
      x: sidebarWidth + (availableWidth / 2), 
      y: window.innerHeight / 2 
    };
    
    moveCamera(node.x, node.y, centerScreenPoint);
  }, [moveCamera]);

  const handleAutoExplore = useCallback(() => {
    if (isAutoExploring) return;
    
    setSelectedNode(null);
    setDashboardPos(null);

    const simulatedActive = new Set(activeIds);
    const sequence: { parentId: string, childId: string, candidateCount: number }[] = [];
    const totalNodes = Object.keys(RAW_TREE).length;

    while (simulatedActive.size < totalNodes) {
      const candidates: { parentId: string, childId: string }[] = [];
      
      simulatedActive.forEach(id => {
        const node = RAW_TREE[id];
        if (node && node.children) {
          node.children.forEach(childId => {
            if (!simulatedActive.has(childId)) {
              candidates.push({ parentId: id, childId });
            }
          });
        }
      });

      if (candidates.length === 0) {
        if (!simulatedActive.has('root')) {
          candidates.push({ parentId: '', childId: 'root' });
        } else {
          break; 
        }
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      simulatedActive.add(chosen.childId);
      sequence.push({ ...chosen, candidateCount: candidates.length });
    }

    if (sequence.length === 0) return;

    setIsAutoExploring(true);

    const delays = sequence.map(step => {
      const baseDelay = Math.max(250, 1100 - (step.candidateCount * 150));
      return baseDelay + Math.random() * (baseDelay * 0.5); 
    });
    
    const totalDurationSeconds = delays.reduce((acc, val) => acc + val, 0) / 1000;

    const targetScale = Math.min(window.innerWidth / 1900, window.innerHeight / 1400); 
    const targetX = window.innerWidth / 2 - (CENTER * targetScale);
    const targetY = window.innerHeight / 2 - (CENTER * targetScale);

    const vp = { ...viewport };

    const centerDuration = 1.0;
    const centerScale = viewport.scale; 
    const centerX = window.innerWidth / 2 - (CENTER * centerScale);
    const centerY = window.innerHeight / 2 - (CENTER * centerScale);

    const tl = gsap.timeline({
      onUpdate: () => setViewport({ x: vp.x, y: vp.y, scale: vp.scale })
    });

    tl.to(vp, {
      x: centerX,
      y: centerY,
      duration: centerDuration,
      ease: "power2.inOut"
    })
    .to(vp, {
      x: targetX,
      y: targetY,
      scale: targetScale,
      duration: totalDurationSeconds,
      ease: "power2.inOut"
    }, "+=0.2");

    let accumulatedTime = (centerDuration + 0.2) * 1000;
    sequence.forEach((step, idx) => {
      setTimeout(() => {
        handleExpandNode(step.parentId === '' ? null : step.parentId, step.childId);
      }, accumulatedTime);
      accumulatedTime += delays[idx];
    });

    setTimeout(() => {
      setIsAutoExploring(false);
    }, accumulatedTime + 2000);

  }, [activeIds, viewport, setViewport, handleExpandNode, isAutoExploring]);

  const handleCloseDashboard = () => {
    setSelectedNode(null);
    setDashboardPos(null);
  };

  if (!isClient || !isReady) return null;

  return (
    <>
      <div onMouseDown={handleMouseDown} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5', position: 'relative', userSelect: 'none', pointerEvents: isAutoExploring ? 'none' : 'auto' }}>
        <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
          {/* ✨ 요소용 크레용 텍스처 복구 (배경에는 안 들어갑니다) */}
          <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {activeNodes.map(node => ( <InkFilter key={`filter-${node.id}`} id={node.id} /> ))}
        </svg>

        <div style={{ position: 'absolute', width: VIRTUAL_SIZE, height: VIRTUAL_SIZE, transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
          
          {/* ✨ 배경 다중 블렌딩 적용: 타일링 경계선 붕괴 기법 */}
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backgroundImage: 'url(/background-image.jpg), url(/background-image.jpg)', 
            backgroundRepeat: 'repeat', 
            backgroundSize: '400px, 733px', // 소수점이 안 떨어지게 크기를 엇갈림
            backgroundBlendMode: 'multiply', // 겹쳐서 불규칙성 증대
            opacity: 0.9 
          }} />
          
          {/* 브랜치 및 요소 레이어에만 filter: url(#crayon-texture) 복구 */}
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
                  <NodePlaceholder x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} iconType={PORTFOLIO_MAP.root.icon} targetDelay={0} onClick={() => handleExpandNode(null, 'root')} isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} />
                </Layer></Stage>
              </div>
            )}
            {activeNodes.map(parentNode => parentNode.children.map(childId => {
              const targetData = PORTFOLIO_MAP[childId];
              if (!targetData || (activeIds.includes(childId) && !fadingIds.includes(childId))) return null;
              return (
                <div key={`placeholder-${childId}`} style={{ position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                  <Stage width={110} height={110}><Layer listening={!isDraggingActive && !fadingIds.includes(childId)}>
                    <NodePlaceholder x={55} y={55} color={targetData.color || '#333333'} iconType={targetData.icon} targetDelay={1.8} onClick={() => handleExpandNode(parentNode.id, childId)} isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} />
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
                  <InkSpread {...node} size={size} stageSize={STAGE_SIZE} x={STAGE_SIZE/2} y={STAGE_SIZE/2} onNodeClick={handleNodeClick} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} isSelected={selectedNode?.id === node.id} />
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
        onAutoExplore={handleAutoExplore} 
        isAutoExploring={isAutoExploring} 
      />

      <Dashboard selectedNode={selectedNode} dashboardPos={dashboardPos} onClose={handleCloseDashboard} />
    </>
  );
};

export default Main;