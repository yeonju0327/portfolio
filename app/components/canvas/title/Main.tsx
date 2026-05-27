'use client'; 

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import { gsap } from 'gsap'; 
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';
import NodePlaceholder from './NodePlaceholder';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar'; 
import CustomCursor from './CustomCursor';
import MiniMap from './MiniMap';
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
  
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  
  const [isAutoExploring, setIsAutoExploring] = useState(false);
  const [nodeDelays, setNodeDelays] = useState<Record<string, number>>({});
  
  const dashboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { viewport, setViewport, isReady, isDraggingActive, handleMouseDown, moveCamera } = useInfiniteCanvas(VIRTUAL_SIZE);

  useEffect(() => { setIsClient(true); }, []);

  const activeNodes = useMemo(() => activeIds.map(id => PORTFOLIO_MAP[id]), [activeIds]);

  const handleExpandNode = useCallback((parentId: string | null, childId: string, customDelay: number = 0) => {
    setActiveIds(prev => {
      if (prev.includes(childId)) return prev;

      if (parentId) {
        setLinks(prevLinks => [...prevLinks, { source: parentId, target: childId, delay: customDelay }]);
      }
      
      if (customDelay > 0) {
        setNodeDelays(prevDelays => ({ ...prevDelays, [childId]: customDelay }));
      }
      
      setFadingIds(prevFading => [...prevFading, childId]);
      setTimeout(() => { 
        setFadingIds(currentFading => currentFading.filter(id => id !== childId)); 
      }, 3500 + (customDelay * 1000)); 

      return [...prev, childId];
    });
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    if (dashboardTimeoutRef.current) clearTimeout(dashboardTimeoutRef.current);
    
    setSelectedNode(null);
    setDashboardPos(null);
    
    setFocusedNodeId(nodeId);

    const targetScreenPoint = { x: window.innerWidth * 0.32, y: window.innerHeight / 2 };
    const pos = 'right';

    moveCamera(node.x, node.y, targetScreenPoint);

    dashboardTimeoutRef.current = setTimeout(() => {
      setSelectedNode(node);
      setDashboardPos(pos);
    }, 600);
  }, [moveCamera]);

  const handleMoveCameraOnly = useCallback((nodeId: string) => {
    const node = PORTFOLIO_MAP[nodeId];
    if (!node) return;

    // ⚠️ [이벤트 락 방지 절대 규칙 준수]: 순수 카메라 이동 로직만 남기고 포커스 변경 상태 유발 코드를 완전 영구 삭제
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
    
    if (dashboardTimeoutRef.current) clearTimeout(dashboardTimeoutRef.current);
    setSelectedNode(null);
    setDashboardPos(null);
    setFocusedNodeId(null); 

    const depths: Record<string, number> = { root: 0 };
    const calcDepth = (id: string, d: number) => {
      depths[id] = d;
      if (RAW_TREE[id] && RAW_TREE[id].children) {
        RAW_TREE[id].children.forEach(childId => calcDepth(childId, d + 1));
      }
    };
    calcDepth('root', 0);

    const simulatedActive = new Set(activeIds);
    const sequence: { parentId: string, childId: string }[][] = [];
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

      let weightedCandidates = candidates.map(c => {
        const depth = depths[c.parentId || 'root'] ?? 0;
        const weight = 1 / Math.pow(depth + 1, 2); 
        return { ...c, weight };
      });

      let pickCount = 1;
      if (candidates.length >= 4) pickCount = 2;
      if (candidates.length >= 7) pickCount = 3;

      const stepNodes = [];
      for (let i = 0; i < pickCount; i++) {
        if (weightedCandidates.length === 0) break;
        
        const totalWeight = weightedCandidates.reduce((sum, c) => sum + c.weight, 0);
        let r = Math.random() * totalWeight;
        let selectedIdx = 0;
        
        for (let j = 0; j < weightedCandidates.length; j++) {
          r -= weightedCandidates[j].weight;
          if (r <= 0) {
            selectedIdx = j;
            break;
          }
        }
        
        const chosen = weightedCandidates[selectedIdx];
        stepNodes.push({ parentId: chosen.parentId, childId: chosen.childId });
        simulatedActive.add(chosen.childId);
        
        weightedCandidates.splice(selectedIdx, 1);
      }
      
      sequence.push(stepNodes);
    }

    if (sequence.length === 0) return;

    setIsAutoExploring(true);

    const delays = sequence.map(stepNodes => {
      const baseDelay = Math.max(150, 600 - (stepNodes.length * 120)); 
      return baseDelay + Math.random() * (baseDelay * 0.3); 
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
    sequence.forEach((stepNodes, idx) => {
      setTimeout(() => {
        stepNodes.forEach(nodeInfo => {
          handleExpandNode(nodeInfo.parentId === '' ? null : nodeInfo.parentId, nodeInfo.childId, 0);
        });
      }, accumulatedTime);
      accumulatedTime += delays[idx];
    });

    setTimeout(() => {
      setIsAutoExploring(false);
    }, accumulatedTime + 2000);

  }, [activeIds, viewport, setViewport, handleExpandNode, isAutoExploring]);

  const handleCloseDashboard = () => {
    if (dashboardTimeoutRef.current) clearTimeout(dashboardTimeoutRef.current);
    setSelectedNode(null);
    setDashboardPos(null);
    setFocusedNodeId(null); 
  };

  if (!isClient || !isReady) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap');
      `}</style>
      <div style={{ fontFamily: "'Nanum Pen Script', cursive", position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
        Preload Handwriting Font
      </div>

      <div onMouseDown={handleMouseDown} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5', position: 'relative', userSelect: 'none', pointerEvents: isAutoExploring ? 'none' : 'auto' }}>
        <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
          <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* ✨ 테두리의 찢어진 종이 질감 연출을 위한 필터 */}
          <filter id="static-paper-edge" x="-10%" y="-10%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="5" result="paper-noise" />
            <feDisplacementMap in="SourceGraphic" in2="paper-noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* ✨ 손글씨 잉크 번짐 질감 연출을 위한 필터 */}
          <filter id="handwriting-ink" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="3" result="ink-noise" />
            <feDisplacementMap in="SourceGraphic" in2="ink-noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.4" />
          </filter>
          {activeNodes.map(node => ( <InkFilter key={`filter-${node.id}`} id={node.id} /> ))}
        </svg>

        <div style={{ position: 'absolute', width: VIRTUAL_SIZE, height: VIRTUAL_SIZE, transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
          
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backgroundImage: 'url(/background-image.jpg)', 
            backgroundRepeat: 'repeat', 
            backgroundSize: 'auto', 
            imageRendering: 'high-quality' as any,
            opacity: 0.9 
          }} />
          
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
                  <NodePlaceholder x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} iconType={PORTFOLIO_MAP.root.icon} targetDelay={0 + (nodeDelays['root'] ?? 0)} onClick={() => handleExpandNode(null, 'root')} isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} />
                </Layer></Stage>
              </div>
            )}
            {activeNodes.map(parentNode => parentNode.children.map(childId => {
              const targetData = PORTFOLIO_MAP[childId];
              if (!targetData || (activeIds.includes(childId) && !fadingIds.includes(childId))) return null;
              
              const parentDelay = nodeDelays[parentNode.id] ?? parentNode.delay ?? 0;

              return (
                <div key={`placeholder-${childId}`} style={{ position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                  <Stage width={110} height={110}><Layer listening={!isDraggingActive && !fadingIds.includes(childId)}>
                    <NodePlaceholder x={55} y={55} color={targetData.color || '#333333'} iconType={targetData.icon} targetDelay={1.8 + parentDelay} onClick={() => handleExpandNode(parentNode.id, childId)} isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} />
                  </Layer></Stage>
                </div>
              );
            }))}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
            {activeNodes.map(node => {
              const size = node.size ?? 85, STAGE_SIZE = size * 5;
              const dynamicDelay = nodeDelays[node.id] ?? node.delay; 
              return (
                <div key={`spread-${node.id}`} style={{ position: 'absolute', left: node.x - STAGE_SIZE/2, top: node.y - STAGE_SIZE/2, width: STAGE_SIZE, height: STAGE_SIZE, pointerEvents: 'none' }}>
                  <InkSpread 
                    {...node} 
                    delay={dynamicDelay} 
                    size={size} 
                    stageSize={STAGE_SIZE} 
                    x={STAGE_SIZE/2} 
                    y={STAGE_SIZE/2} 
                    onNodeClick={handleNodeClick} 
                    isDraggingActive={isDraggingActive} 
                    isAutoExploring={isAutoExploring} 
                    isSelected={focusedNodeId === node.id} 
                  />
                </div>
              );
            })}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}><Layer>
              {activeNodes.map(node => {
                const dynamicDelay = nodeDelays[node.id] ?? node.delay;
                return <InkDrop key={`drop-${node.id}`} {...node} delay={dynamicDelay} />;
              })}
            </Layer></Stage>
          </div>
        </div>
      </div>

      <Sidebar 
        activeIds={activeIds} 
        onExpandNode={handleExpandNode} 
        onMoveCameraOnly={handleMoveCameraOnly}
        onNodeDoubleClick={handleNodeClick} 
        onAutoExplore={handleAutoExplore} 
        isAutoExploring={isAutoExploring} 
      />

      <Dashboard selectedNode={selectedNode} dashboardPos={dashboardPos} onClose={handleCloseDashboard} />

      <MiniMap viewport={viewport} setViewport={setViewport} activeIds={activeIds} />

      <CustomCursor focusedNodeId={focusedNodeId} isAutoExploring={isAutoExploring} />
    </>
  );
};

export default Main;