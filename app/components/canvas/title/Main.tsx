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

type MapData = Record<string, NodeProps & { children: string[], icon: string }>;

const PORTFOLIO_MAP: MapData = {
  'root': { id: 'root', x: CENTER, y: CENTER, size: 85, color: '#333333', img: '/images/node-image.jpg', delay: 0, children: ['about', 'projects'], icon: 'plus', caption: '탐색 시작하기' },
  'about': { id: 'about', x: CENTER - 280, y: CENTER - 120, size: 75, color: '#8AB0D0', img: '/images/node-image3.jpg', delay: 0.2, children: ['skills'], icon: 'about', caption: 'About Me' },
  'projects': { id: 'projects', x: CENTER + 300, y: CENTER - 150, size: 65, color: '#FF8D7D', img: '/images/node-image2.jpg', delay: 0.2, children: ['project-a', 'project-b'], icon: 'project', caption: 'My Projects' },
  'skills': { id: 'skills', x: CENTER - 450, y: CENTER + 80, size: 60, color: '#9CC09C', img: '/images/node-image4.jpg', delay: 0.2, children: [], icon: 'skill', caption: 'Tech Stack' },
  'project-a': { id: 'project-a', x: CENTER + 500, y: CENTER + 50, size: 70, color: '#AFA1D6', img: '/images/node-image5.jpg', delay: 0.2, children: [], icon: 'project', caption: 'Interactive Canvas' },
  'project-b': { id: 'project-b', x: CENTER + 180, y: CENTER + 250, size: 60, color: '#FFB3A7', img: '/images/node-image2.jpg', delay: 0.2, children: [], icon: 'project', caption: '3D WebGL Portfolio' },
};

const Main = () => {
  const [isClient, setIsClient] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [links, setLinks] = useState<{source: string, target: string, delay: number}[]>([]);
  const [fadingIds, setFadingIds] = useState<string[]>([]);

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
    console.log(`${nodeId} 노드 클릭됨`);
  }, []);

  if (!isClient || !isReady) return null;

  return (
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

        {/* --- LAYER 1: 간선 (가장 아래) --- */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          pointerEvents: 'none', filter: 'url(#crayon-texture)', zIndex: 10 
        }}>
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

        {/* --- LAYER 2: 플레이스홀더 (간선 위, 노드 아래) --- */}
        {/* 수정됨: 전체 컨테이너는 클릭을 통과시킴 (none) */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          pointerEvents: 'none', zIndex: 20 
        }}>
          {(!activeIds.includes('root') || fadingIds.includes('root')) && (
            // 수정됨: 개별 요소 래퍼에서만 클릭 이벤트를 활성화 (auto)
            <div style={{ 
              position: 'absolute', left: PORTFOLIO_MAP.root.x - 55, top: PORTFOLIO_MAP.root.y - 55, 
              width: 110, height: 110, filter: 'url(#crayon-texture)',
              pointerEvents: isDraggingActive ? 'none' : 'auto'
            }}>
              <Stage width={110} height={110}>
                <Layer listening={!isDraggingActive && !fadingIds.includes('root')}>
                  <NodePlaceholder
                    x={55} y={55} color={PORTFOLIO_MAP.root.color || '#333333'} 
                    iconType={PORTFOLIO_MAP.root.icon} targetDelay={0} 
                    onClick={() => handleExpandNode(null, 'root')}
                    isFading={fadingIds.includes('root')} isDraggingActive={isDraggingActive}
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
                // 수정됨: 개별 요소 래퍼에서만 클릭 이벤트를 활성화 (auto)
                <div key={`placeholder-${childId}`} style={{ 
                  position: 'absolute', left: targetData.x - 55, top: targetData.y - 55, 
                  width: 110, height: 110, filter: 'url(#crayon-texture)',
                  pointerEvents: isDraggingActive ? 'none' : 'auto'
                }}>
                  <Stage width={110} height={110}>
                    <Layer listening={!isDraggingActive && !fadingIds.includes(childId)}>
                      <NodePlaceholder
                        x={55} y={55} color={targetData.color || '#333333'} 
                        iconType={targetData.icon} targetDelay={1.8} 
                        onClick={() => handleExpandNode(parentNode.id, childId)}
                        isFading={fadingIds.includes(childId)} isDraggingActive={isDraggingActive}
                      />
                    </Layer>
                  </Stage>
                </div>
              );
            })
          )}
        </div>

        {/* --- LAYER 3: 노드 (InkSpread - 가장 위) --- */}
        {/* 수정됨: 전체 컨테이너는 클릭을 통과시킴 (none) */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          pointerEvents: 'none', zIndex: 30 
        }}>
          {activeNodes.map(node => {
            const size = node.size ?? 85;
            const STAGE_SIZE = (size + 50) * 2;
            return (
              // 수정됨: 개별 요소 래퍼에서만 클릭 이벤트를 활성화 (auto)
              <div key={`spread-${node.id}`} style={{ 
                position: 'absolute', left: node.x - STAGE_SIZE/2, top: node.y - STAGE_SIZE/2, 
                width: STAGE_SIZE, height: STAGE_SIZE, filter: `url(#ink-bleed-${node.id})`,
                pointerEvents: isDraggingActive ? 'none' : 'auto'
              }}>
                <Stage width={STAGE_SIZE} height={STAGE_SIZE}>
                  <Layer>
                    <InkSpread 
                      {...node} size={size} x={STAGE_SIZE/2} y={STAGE_SIZE/2} 
                      onNodeClick={handleNodeClick} isDraggingActive={isDraggingActive} 
                    />
                  </Layer>
                </Stage>
              </div>
            );
          })}
        </div>

        {/* --- LAYER 4: 드롭 (잉크 방울 - 시각적 특수효과로 최상단 유지) --- */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          pointerEvents: 'none', zIndex: 40 
        }}>
          <Stage width={VIRTUAL_SIZE} height={VIRTUAL_SIZE}>
            <Layer>
              {activeNodes.map(node => ( <InkDrop key={`drop-${node.id}`} {...node} /> ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
};

export default Main;