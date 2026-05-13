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
};

// 1. 내부 구현용 트리 데이터
const RAW_TREE: Record<string, RawNodeData> = {
  'root': { id: 'root', color: '#2C2C2C', img: '/images/node-image.jpg', icon: 'about', caption: 'Profile & Skills', children: ['works-web', 'works-game', 'works-data', 'works-design'] },
  
  'works-web': { id: 'works-web', color: '#E08E6D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Web Projects', children: ['web-1', 'web-2'] },
  'works-game': { id: 'works-game', color: '#B5749E', img: '/images/node-image2.jpg', icon: 'project', caption: 'Game Projects', children: ['game-1'] },
  'works-data': { id: 'works-data', color: '#6E88B5', img: '/images/node-image.jpg', icon: 'project', caption: 'Data Vis', children: ['data-1'] },
  'works-design': { id: 'works-design', color: '#DDA05B', img: '/images/node-image3.jpg', icon: 'project', caption: 'Design', children: ['design-1', 'design-2'] },
  
  'web-1': { id: 'web-1', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Portfolio Site', children: [] },
  'web-2': { id: 'web-2', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'E-commerce', children: [] },
  'game-1': { id: 'game-1', color: '#C88AB2', img: '/images/node-image2.jpg', icon: 'project', caption: '2D Platformer', children: [] },
  'data-1': { id: 'data-1', color: '#859FCF', img: '/images/node-image.jpg', icon: 'project', caption: 'COVID Tracker', children: [] },
  'design-1': { id: 'design-1', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'Brand Identity', children: [] },
  'design-2': { id: 'design-2', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'UI/UX App', children: [] },
};

type MapData = Record<string, NodeProps & { children: string[], icon: string, caption?: string }>;

const buildRadialMap = (): MapData => {
  const map: MapData = {} as MapData;

  const traverse = (nodeId: string, depth: number, angle: number, angleRange: number, cx: number, cy: number) => {
    const raw = RAW_TREE[nodeId];
    if (!raw) return;

    let size = 110;
    let radiusX = 0;
    let radiusY = 0;

    if (depth === 0) { 
      size = 110; radiusX = 0; radiusY = 0; 
    } else if (depth === 1) { 
      size = 85; radiusX = 420; radiusY = 260; 
    } else if (depth === 2) { 
      size = 65; radiusX = 280; radiusY = 180; 
    }

    const x = depth === 0 ? cx : cx + Math.cos(angle) * radiusX;
    const y = depth === 0 ? cy : cy + Math.sin(angle) * radiusY;

    map[nodeId] = {
      ...raw, x, y, size, delay: depth === 0 ? 0 : 0.2,
    };

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
  
  const [showProfile, setShowProfile] = useState(false);

  const { viewport, isReady, isDraggingActive, handleMouseDown } = useInfiniteCanvas(VIRTUAL_SIZE);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeNodes = useMemo(() => activeIds.map(id => PORTFOLIO_MAP[id]), [activeIds]);

  const handleExpandNode = useCallback((parentId: string | null, childId: string) => {
    if (activeIds.includes(childId) || fadingIds.includes(childId)) return;
    setActiveIds(prev => [...prev, childId]);
    if (parentId) {
      setLinks(prev => [...prev, { source: parentId, target: childId, delay: 0 }]); 
    }
    setFadingIds(prev => [...prev, childId]);
    setTimeout(() => {
      setFadingIds(prev => prev.filter(id => id !== childId));
    }, 3500);
  }, [activeIds, fadingIds]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (nodeId === 'root') {
      setShowProfile(true);
    } else {
      console.log(`${nodeId} 작업물 상세 뷰어 오픈`);
    }
  }, []);

  if (!isClient || !isReady) return null;

  return (
    <>
      <div 
        onMouseDown={handleMouseDown}
        style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5', position: 'relative', userSelect: 'none' }}
      >
        <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
          <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {activeNodes.map(node => ( <InkFilter key={`filter-${node.id}`} id={node.id} /> ))}
        </svg>

        <div style={{
          position: 'absolute', width: VIRTUAL_SIZE, height: VIRTUAL_SIZE,
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: '0 0', willChange: 'transform',
        }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: 'url(/background-image.jpg)', backgroundRepeat: 'repeat' }} />

          {/* --- LAYER 1: 간선 --- */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', filter: 'url(#crayon-texture)', zIndex: 10 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}>
              <Layer>
                {links.map((link, idx) => {
                  const sourceNode = PORTFOLIO_MAP[link.source];
                  const targetNode = PORTFOLIO_MAP[link.target];
                  if (!sourceNode || !targetNode) return null;
                  const { startX, startY, endX, endY } = getEdgePoints(sourceNode, targetNode);
                  return (
                    <Branch
                      key={`branch-${idx}`} startX={startX} startY={startY} endX={endX} endY={endY}
                      startColor={sourceNode.color || '#333333'} endColor={targetNode.color || '#333333'} delay={link.delay}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </div>

          {/* --- LAYER 2: 플레이스홀더 --- */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
            {(!activeIds.includes('root') || fadingIds.includes('root')) && (
              <div style={{ 
                position: 'absolute', left: PORTFOLIO_MAP.root.x - 55, top: PORTFOLIO_MAP.root.y - 55, width: 110, height: 110, 
                filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto',
                clipPath: 'circle(50% at 50% 50%)'
              }}>
                <Stage width={110} height={110}>
                  <Layer listening={!isDraggingActive && !fadingIds.includes('root')}>
                    <NodePlaceholder
                      x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} iconType={PORTFOLIO_MAP.root.icon} targetDelay={0} 
                      onClick={() => handleExpandNode(null, 'root')} isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive}
                    />
                  </Layer>
                </Stage>
              </div>
            )}

            {activeNodes.map(parentNode => 
              parentNode.children.map(childId => {
                if (activeIds.includes(childId) && !fadingIds.includes(childId)) return null; 
                const targetData = PORTFOLIO_MAP[childId];
                if (!targetData) return null;
                return (
                  <div key={`placeholder-${childId}`} style={{ 
                    position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, width: 110, height: 110, 
                    filter: 'url(#crayon-texture)', pointerEvents: isDraggingActive ? 'none' : 'auto',
                    clipPath: 'circle(50% at 50% 50%)'
                  }}>
                    <Stage width={110} height={110}>
                      <Layer listening={!isDraggingActive && !fadingIds.includes(childId)}>
                        <NodePlaceholder
                          x={55} y={55} color={targetData.color || '#333333'} iconType={targetData.icon} targetDelay={1.8} 
                          onClick={() => handleExpandNode(parentNode.id, childId)} isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive}
                        />
                      </Layer>
                    </Stage>
                  </div>
                );
              })
            )}
          </div>

          {/* --- LAYER 3: 노드 --- */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
            {activeNodes.map(node => {
              const size = node.size ?? 85;
              const STAGE_SIZE = size * 5; 

              return (
                <div key={`spread-${node.id}`} style={{ 
                  position: 'absolute', left: node.x - STAGE_SIZE/2, top: node.y - STAGE_SIZE/2, 
                  width: STAGE_SIZE, height: STAGE_SIZE, pointerEvents: isDraggingActive ? 'none' : 'auto',
                  // ✨ 텍스트 잘림 해결: 하단(95%) 텍스트 박스 공간을 완전히 살리면서 모서리를 자르는 팔각형 클리핑 영역 적용
                  clipPath: 'polygon(30% 10%, 70% 10%, 85% 35%, 85% 65%, 75% 95%, 25% 95%, 15% 65%, 15% 35%)'
                }}>
                  <InkSpread 
                    {...node} size={size} stageSize={STAGE_SIZE} x={STAGE_SIZE/2} y={STAGE_SIZE/2} 
                    onNodeClick={handleNodeClick} isDraggingActive={isDraggingActive} 
                  />
                </div>
              );
            })}
          </div>

          {/* --- LAYER 4: 드롭 방울 --- */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
            <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}>
              <Layer>
                {activeNodes.map(node => ( <InkDrop key={`drop-${node.id}`} {...node} /> ))}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {showProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(229, 229, 229, 0.75)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '90%', maxWidth: '800px', height: '80vh',
            backgroundColor: '#F7F5F0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.02)',
            borderRadius: '4px', position: 'relative', padding: '40px',
            overflowY: 'auto', border: '1px solid #E2DEC9',
          }}>
            <button 
              onClick={() => setShowProfile(false)} 
              style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#333' }}
            >
              ✕
            </button>
            <h1 style={{ borderBottom: '2px solid #2C2C2C', paddingBottom: '10px', color: '#2C2C2C' }}>About Me</h1>
            <p style={{ marginTop: '20px', lineHeight: '1.6', color: '#555' }}>이곳에 상세한 프로필과 기술 스택을 마크업하여 작성하시면 됩니다.</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Main;