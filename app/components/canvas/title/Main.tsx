'use client'; 

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { NodeProps } from './types';
import { getEdgePoints } from './utils';
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';
import NodePlaceholder from './NodePlaceholder';
import { useInfiniteCanvas } from '../../../hooks/useInfiniteCanvas'; 

const VIRTUAL_SIZE = 4000;
const CENTER = VIRTUAL_SIZE / 2;

type RawNodeData = {
  id: string;
  color: string;
  img: string;
  icon: string;
  caption: string;
  children: string[];
  description?: string;
};

const RAW_TREE: Record<string, RawNodeData> = {
  'root': { id: 'root', color: '#2C2C2C', img: '/images/node-image.jpg', icon: 'about', caption: 'Profile & Skills', children: ['works-web', 'works-game', 'works-data', 'works-design'], description: '안녕하세요, 인터랙티브 웹 개발자입니다.' },
  'works-web': { id: 'works-web', color: '#E08E6D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Web Projects', children: ['web-1', 'web-2'], description: 'Next.js와 GSAP을 활용한 현대적인 웹 프로젝트 모음입니다.' },
  'works-game': { id: 'works-game', color: '#B5749E', img: '/images/node-image2.jpg', icon: 'project', caption: 'Game Projects', children: ['game-1'], description: 'Unity와 Canvas API를 이용한 게임 개발 기록입니다.' },
  'works-data': { id: 'works-data', color: '#6E88B5', img: '/images/node-image.jpg', icon: 'project', caption: 'Data Vis', children: ['data-1'], description: '복잡한 데이터를 직관적으로 풀어낸 시각화 프로젝트입니다.' },
  'works-design': { id: 'works-design', color: '#DDA05B', img: '/images/node-image3.jpg', icon: 'project', caption: 'Design', children: ['design-1', 'design-2'], description: '사용자 경험을 최우선으로 고려한 UI/UX 디자인 작업물입니다.' },
  'web-1': { id: 'web-1', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Portfolio Site', children: [], description: '현재 보고 계시는 인터랙티브 노드 맵 포트폴리오입니다.' },
  'web-2': { id: 'web-2', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'E-commerce', children: [], description: '반응형 디자인이 적용된 쇼핑몰 웹사이트입니다.' },
  'game-1': { id: 'game-1', color: '#C88AB2', img: '/images/node-image2.jpg', icon: 'project', caption: '2D Platformer', children: [], description: '부드러운 조작감을 자랑하는 2D 플랫포머 게임입니다.' },
  'data-1': { id: 'data-1', color: '#859FCF', img: '/images/node-image.jpg', icon: 'project', caption: 'COVID Tracker', children: [], description: '전 세계 코로나 확산 추이를 시각화한 대시보드입니다.' },
  'design-1': { id: 'design-1', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'Brand Identity', children: [], description: '가상의 카페 브랜드를 위한 로고 및 아이덴티티 디자인입니다.' },
  'design-2': { id: 'design-2', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'UI/UX App', children: [], description: '사용자 친화적인 일정 관리 모바일 앱 디자인입니다.' },
};

type MapData = Record<string, NodeProps & { children: string[], icon: string, caption?: string, description?: string }>;

const buildRadialMap = (): MapData => {
  const map: MapData = {} as MapData;
  const traverse = (nodeId: string, depth: number, angle: number, angleRange: number, cx: number, cy: number) => {
    const raw = RAW_TREE[nodeId];
    if (!raw) return;
    let size = 110, radiusX = 0, radiusY = 0;
    
    if (depth === 0) { 
      size = 110; radiusX = 0; radiusY = 0; 
    } else if (depth === 1) { 
      size = 85; radiusX = 480; radiusY = 310;
    } else if (depth === 2) { 
      size = 65; radiusX = 320; radiusY = 210;
    }

    const x = depth === 0 ? cx : cx + Math.cos(angle) * radiusX;
    const y = depth === 0 ? cy : cy + Math.sin(angle) * radiusY;
    map[nodeId] = { ...raw, x, y, size, delay: depth === 0 ? 0 : 0.2 };
    const childrenCount = raw.children.length;
    if (childrenCount > 0) {
      const step = depth === 0 ? (Math.PI * 2) / childrenCount : angleRange / Math.max(1, childrenCount);
      const startAngle = depth === 0 ? -Math.PI / 4 : angle - angleRange / 2 + step / 2;
      raw.children.forEach((childId, idx) => {
        const childAngle = startAngle + idx * step;
        traverse(childId, depth + 1, childAngle, Math.PI / 1.5, x, y);
      });
    }
  };
  traverse('root', 0, 0, Math.PI * 2, CENTER, CENTER);
  return map;
};

const PORTFOLIO_MAP = buildRadialMap();

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

    let targetScreenPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let pos: 'left' | 'right' | 'top' = 'left';

    if (nodeId === 'root') {
      targetScreenPoint = { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
      pos = 'top';
    } else if (node.x < CENTER) {
      targetScreenPoint = { x: window.innerWidth * 0.75, y: window.innerHeight / 2 };
      pos = 'left';
    } else {
      targetScreenPoint = { x: window.innerWidth * 0.25, y: window.innerHeight / 2 };
      pos = 'right';
    }

    setSelectedNode(node);
    setDashboardPos(pos);
    moveCamera(node.x, node.y, targetScreenPoint);
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
                <div key={`spread-${node.id}`} style={{ 
                  position: 'absolute', left: node.x - STAGE_SIZE/2, top: node.y - STAGE_SIZE/2, width: STAGE_SIZE, height: STAGE_SIZE, 
                  pointerEvents: 'none'
                }}>
                  <InkSpread 
                    {...node} size={size} stageSize={STAGE_SIZE} x={STAGE_SIZE/2} y={STAGE_SIZE/2} 
                    onNodeClick={handleNodeClick} isDraggingActive={isDraggingActive} 
                    isSelected={selectedNode?.id === node.id}
                  />
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

      {/* ✨ 대시보드 오버레이 섹션 */}
      {selectedNode && (
        <>
          {/* 1. 바깥쪽 클릭 감지 레이어 (Backdrop) */}
          <div 
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, backgroundColor: 'rgba(0,0,0,0.05)' }} 
            onClick={handleCloseDashboard} 
          />

          {/* 2. 대시보드 팝업 */}
          <div 
            className={`dashboard ${dashboardPos}`}
            style={{
              position: 'fixed',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              padding: '50px',
              backgroundColor: '#F7F5F0',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #E2DEC9',
              borderRadius: '24px', 
              animation: 'inkSpreadIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              ...(dashboardPos === 'left' && { left: '24px', top: '24px', width: '35vw', minWidth: '400px', height: 'calc(100vh - 48px)' }),
              ...(dashboardPos === 'right' && { right: '24px', top: '24px', width: '35vw', minWidth: '400px', height: 'calc(100vh - 48px)' }),
              ...(dashboardPos === 'top' && { left: '24px', top: '24px', width: 'calc(100vw - 48px)', height: '45vh' }),
            }}
          >
            <button onClick={handleCloseDashboard} style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#333' }}>✕</button>
            
            <div style={{ flex: 1, opacity: 0, animation: 'fadeInContent 0.5s 0.4s forwards', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <h2 style={{ color: selectedNode.color, borderBottom: `4px solid ${selectedNode.color}`, paddingBottom: '15px', fontSize: '2.5rem', margin: 0 }}>
                {selectedNode.caption}
              </h2>
              <p style={{ marginTop: '30px', fontSize: '1.15rem', lineHeight: '1.8', color: '#444' }}>
                {selectedNode.description}
              </p>
              
              {/* ✨ 버튼 크기 및 위치 조정 */}
              <button 
                className="view-more-btn"
                style={{
                  marginTop: 'auto', 
                  padding: '12px 24px', // 패딩 축소
                  backgroundColor: selectedNode.color,
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '30px', // 더 둥글게
                  cursor: 'pointer',
                  fontSize: '0.95rem', // 폰트 크기 축소
                  fontWeight: 'bold', 
                  transition: 'transform 0.2s', 
                  width: 'fit-content', // 텍스트 길이에 맞춤
                  alignSelf: dashboardPos === 'top' ? 'center' : 'flex-start', // 상단 모드에선 중앙, 아니면 왼쪽 정렬
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
                onClick={() => alert(`${selectedNode.id} 상세 페이지로 전체 확장 이동!`)}
              >
                VIEW PROJECT DETAILS
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes inkSpreadIn {
          from { 
            clip-path: circle(0% at ${dashboardPos === 'left' ? '0% 50%' : dashboardPos === 'right' ? '100% 50%' : '50% 0%'});
            opacity: 0;
          }
          to { 
            clip-path: circle(150% at ${dashboardPos === 'left' ? '0% 50%' : dashboardPos === 'right' ? '100% 50%' : '50% 0%'});
            opacity: 1;
          }
        }
        @keyframes fadeInContent {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .view-more-btn:hover { transform: translateY(-2px) scale(1.03); }
        .view-more-btn:active { transform: translateY(0) scale(0.98); }
      `}</style>
    </>
  );
};

export default Main;