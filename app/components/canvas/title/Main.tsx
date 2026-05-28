'use client'; 

import React, { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { gsap } from 'gsap'; 
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';
import NodePlaceholder from './NodePlaceholder';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar'; 
import MiniMap from './MiniMap';
import { useInfiniteCanvas } from '../../../hooks/useInfiniteCanvas'; 
import { PORTFOLIO_MAP, CENTER, MapData, RAW_TREE } from './data';
import { useTransitionContext } from '../../../context/TransitionContext';
import { getEdgePoints } from './utils';

const VIRTUAL_SIZE = 5000;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const Main = () => {
  const { playInTransition } = useTransitionContext();
  const isRestoredRef = useRef(typeof window !== 'undefined' ? sessionStorage.getItem('portfolio_should_restore') === 'true' : false);
  const [isRestored, setIsRestored] = useState(() => isRestoredRef.current);
  const [isClient, setIsClient] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      const saved = sessionStorage.getItem('portfolio_active_ids');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [links, setLinks] = useState<{source: string, target: string, delay: number}[]>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      const saved = sessionStorage.getItem('portfolio_links');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [fadingIds, setFadingIds] = useState<string[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<MapData[string] | null>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      if (savedFocused) {
        return PORTFOLIO_MAP[savedFocused] || null;
      }
    }
    return null;
  });
  const [dashboardPos, setDashboardPos] = useState<'left' | 'right' | 'top' | null>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      const savedDashboardOpen = sessionStorage.getItem('portfolio_dashboard_open');
      // 대시보드가 열려있었고 & 포커스된 노드가 있는 경우에만 복원
      if (savedFocused && PORTFOLIO_MAP[savedFocused] && savedDashboardOpen === 'true') {
        return 'right';
      }
    }
    return null;
  });
  
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      return sessionStorage.getItem('portfolio_focused_node');
    }
    return null;
  });
  
  const [isAutoExploring, setIsAutoExploring] = useState(false);
  const [nodeDelays, setNodeDelays] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      const saved = sessionStorage.getItem('portfolio_node_delays');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  const dashboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { viewport, setViewport, viewportRef, isReady, isDraggingActive, handleMouseDown, moveCamera } = useInfiniteCanvas(VIRTUAL_SIZE, isRestoredRef.current);

  useEffect(() => { setIsClient(true); }, []);

  // 바디 어트리뷰트 동기화 (최상위 CustomCursor 제어용)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (focusedNodeId) {
      document.body.setAttribute('data-focused-node', focusedNodeId);
    } else {
      document.body.removeAttribute('data-focused-node');
    }
  }, [focusedNodeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAutoExploring) {
      document.body.setAttribute('data-auto-exploring', 'true');
    } else {
      document.body.removeAttribute('data-auto-exploring');
    }
  }, [isAutoExploring]);

  // 노드 상태 세션스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('portfolio_active_ids', JSON.stringify(activeIds));
      sessionStorage.setItem('portfolio_links', JSON.stringify(links));
      sessionStorage.setItem('portfolio_node_delays', JSON.stringify(nodeDelays));
    }
  }, [activeIds, links, nodeDelays]);

  // 대시보드 포커스 세션스토리지 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (focusedNodeId) {
        sessionStorage.setItem('portfolio_focused_node', focusedNodeId);
      } else {
        sessionStorage.removeItem('portfolio_focused_node');
      }
    }
  }, [focusedNodeId]);

  // 대시보드 on/off 상태 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('portfolio_dashboard_open', dashboardPos ? 'true' : 'false');
    }
  }, [dashboardPos]);

  // 마운트 시 대시보드 포커스 복원 및 복원 플래그 소모 (없을 시 일괄 삭제)
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (isRestoredRef.current) {
      // 복원 대상 노드 ID 획득 및 In-transition 연동
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      if (savedFocused && PORTFOLIO_MAP[savedFocused]) {
        const node = PORTFOLIO_MAP[savedFocused];
        // 뷰포트가 복원되어 있으므로 최신 뷰포트를 사용하여 스크린 위치 역산
        const screenX = node.x * viewportRef.current.scale + viewportRef.current.x;
        const screenY = node.y * viewportRef.current.scale + viewportRef.current.y;
        const sizeVal = node.size ?? 85;
        const screenRadius = sizeVal * 1.15 * viewportRef.current.scale;
        const screenImageRadius = (sizeVal - 5) * 1.15 * viewportRef.current.scale;
        playInTransition(screenX, screenY, screenRadius, screenImageRadius, node.img || '', node.color || '#2C2C2C');
      }

      // 복원 플래그 소모
      sessionStorage.removeItem('portfolio_should_restore');
      // 마운트 완료 후 일정 시간 뒤에 복원 상태를 해제하여 이후 애니메이션이 동작하게 함
      const timer = setTimeout(() => {
        setIsRestored(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 새로고침이나 첫 진입의 경우 세션 상태 일괄 완전 파괴
      sessionStorage.removeItem('portfolio_viewport');
      sessionStorage.removeItem('portfolio_active_ids');
      sessionStorage.removeItem('portfolio_links');
      sessionStorage.removeItem('portfolio_node_delays');
      sessionStorage.removeItem('portfolio_focused_node');
      sessionStorage.removeItem('portfolio_sidebar_open');
      sessionStorage.removeItem('portfolio_dashboard_open');
    }
  }, [playInTransition]);

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

    // ✨ [성능 최적화 #6] viewportRef.current를 animate → stale closure 해결
    // onUpdate에서 ref를 통해 항상 최신값을 setViewport에 전달
    const vp = viewportRef.current;

    const centerDuration = 1.0;
    const centerScale = vp.scale; 
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

  }, [activeIds, viewportRef, setViewport, handleExpandNode, isAutoExploring]);

  const handleCloseDashboard = () => {
    if (dashboardTimeoutRef.current) clearTimeout(dashboardTimeoutRef.current);
    setSelectedNode(null);
    setDashboardPos(null);
    setFocusedNodeId(null); 
  };

  if (!isClient || !isReady) return null;

  return (
    <>
      <div style={{ fontFamily: "'Nanum Pen Script', cursive", position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
        Preload Handwriting Font
      </div>

      <div onMouseDown={handleMouseDown} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5', position: 'relative', userSelect: 'none', pointerEvents: isAutoExploring ? 'none' : 'auto' }}>
        <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
          <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* ✨ 테두리의 찢어진 종이 질감 연출을 위한 필터 */}
          <filter id="static-paper-edge" x="-10%" y="-10%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="paper-noise" />
            <feDisplacementMap in="SourceGraphic" in2="paper-noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* ✨ 손글씨 잉크 번짐 질감 연출을 위한 필터 */}
          <filter id="handwriting-ink" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="2" result="ink-noise" />
            <feDisplacementMap in="SourceGraphic" in2="ink-noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.4" />
          </filter>
          {activeNodes.map(node => ( <InkFilter key={`filter-${node.id}`} id={node.id} /> ))}
        </svg>

        {/* 1. 가상 절대 컨테이너 (배경 및 모든 레이어 통합) */}
        <div style={{ position: 'absolute', width: VIRTUAL_SIZE, height: VIRTUAL_SIZE, transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
          
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backgroundImage: 'url(/background-image.jpg)', 
            backgroundRepeat: 'repeat', 
            backgroundSize: 'auto', 
            imageRendering: 'high-quality' as any,
            opacity: 0.9 
          }} />

          {/* 연결선 Stage (5000x5000) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', filter: 'url(#crayon-texture)', zIndex: 10 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}><Layer>
              {links.map((link, idx) => {
                const s = PORTFOLIO_MAP[link.source], t = PORTFOLIO_MAP[link.target];
                if (!s || !t) return null;
                const { startX, startY, endX, endY } = getEdgePoints(s, t);
                return <Branch key={`branch-${idx}`} startX={startX} startY={startY} endX={endX} endY={endY} startColor={s.color || '#333'} endColor={t.color || '#333'} delay={link.delay} isRestored={isRestoredRef.current} />;
              })}
            </Layer></Stage>
          </div>
          
          {/* 가이드 노드 플레이스홀더 (Stage 래퍼 제거하고 순수 SVG 컴포넌트로 직접 렌더링) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
            {(!activeIds.includes('root') || fadingIds.includes('root')) && (
              <div style={{ position: 'absolute', left: PORTFOLIO_MAP.root.x - 55, top: PORTFOLIO_MAP.root.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                <NodePlaceholder x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} iconType={PORTFOLIO_MAP.root.icon} targetDelay={0 + (nodeDelays['root'] ?? 0)} onClick={() => handleExpandNode(null, 'root')} isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} isRestored={isRestoredRef.current} />
              </div>
            )}
            {activeNodes.map(parentNode => parentNode.children.map(childId => {
              const targetData = PORTFOLIO_MAP[childId];
              if (!targetData || (activeIds.includes(childId) && !fadingIds.includes(childId))) return null;
              
              const parentDelay = nodeDelays[parentNode.id] ?? parentNode.delay ?? 0;

              return (
                <div key={`placeholder-${childId}`} style={{ position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, width: 110, height: 110, filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto', borderRadius: '50%' }}>
                  <NodePlaceholder x={55} y={55} color={targetData.color || '#333333'} iconType={targetData.icon} targetDelay={1.8 + parentDelay} onClick={() => handleExpandNode(parentNode.id, childId)} isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive} isAutoExploring={isAutoExploring} isRestored={isRestoredRef.current} />
                </div>
              );
            }))}
          </div>

          {/* 노드 본체 (InkSpread) */}
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
                    isRestored={isRestoredRef.current}
                  />
                </div>
              );
            })}
          </div>

          {/* 물방울 낙하 Stage (5000x5000) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}><Layer>
              {!isRestoredRef.current && activeNodes.map(node => {
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
        isAutoExploring={isAutoExploring} 
        isRestored={isRestored}
      />

      <Dashboard selectedNode={selectedNode} dashboardPos={dashboardPos} onClose={handleCloseDashboard} isRestored={isRestored} getViewport={() => viewportRef.current} />

      <MiniMap viewport={viewport} setViewport={setViewport} activeIds={activeIds} links={links} isAutoExploring={isAutoExploring} onAutoExplore={handleAutoExplore} />
    </>
  );
};

export default Main;