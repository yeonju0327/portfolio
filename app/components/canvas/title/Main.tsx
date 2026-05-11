'use client'; 

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import { NodeProps } from './types';
import { getEdgePoints } from './utils';
import InkFilter from './InkFilter';
import Branch from './Branch';
import InkDrop from './InkDrop';
import InkSpread from './InkSpread';

const NEXT_NODES_PRESETS = [
  { dx: 300, dy: -150, size: 65, color: '#FF5733', img: '/images/node-image2.jpg' },
  { dx: -280, dy: -120, size: 75, color: '#33A1FF', img: '/images/node-image3.jpg' },
  { dx: 180, dy: 250, size: 60, color: '#28B463', img: '/images/node-image4.jpg' },
  { dx: -200, dy: 220, size: 70, color: '#8E44AD', img: '/images/node-image5.jpg' },
];

const Main = () => {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [isClient, setIsClient] = useState(false);
  const [nodes, setNodes] = useState<NodeProps[]>([]);
  const [links, setLinks] = useState<{source: string, target: string, delay: number}[]>([]);

  const stateRef = useRef({ nodes, links });
  useEffect(() => {
    stateRef.current = { nodes, links };
  }, [nodes, links]);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setDimensions({ width: w, height: h });
    setIsClient(true);
    
    setNodes([{ id: 'root', x: w / 2, y: h / 2, size: 85, color: '#000000', img: '/images/node-image.jpg', delay: 0 }]);
    setLinks([]);

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = useCallback((sourceId: string) => {
    const { nodes: currentNodes, links: currentLinks } = stateRef.current;
    const childIndex = currentLinks.length;
    if (childIndex >= NEXT_NODES_PRESETS.length) return; 
    
    const sourceNode = currentNodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const preset = NEXT_NODES_PRESETS[childIndex];
    const newId = `child-${childIndex + 1}`;

    const newLink = { source: sourceId, target: newId, delay: 0.1 }; 
    const newNode = {
      id: newId, x: sourceNode.x + preset.dx, y: sourceNode.y + preset.dy,
      size: preset.size, color: preset.color, img: preset.img, 
      delay: 0.5 
    };

    setLinks(prev => [...prev, newLink]);
    setNodes(prev => [...prev, newNode]);
  }, []);

  if (!isClient) return null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundImage: 'url(/background-image.jpg)', backgroundRepeat: 'repeat', overflow: 'hidden' }}>
      
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="crayon-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        
        {nodes.map(node => (
          <InkFilter key={`filter-${node.id}`} id={node.id} />
        ))}
      </svg>

      <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', filter: 'url(#crayon-texture)' }}>
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {links.map((link, idx) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;
              const { startX, startY, endX, endY } = getEdgePoints(sourceNode, targetNode);

              return (
                <Branch
                  key={`branch-${idx}`} startX={startX} startY={startY} endX={endX} endY={endY}
                  startColor={sourceNode.color || '#000000'} endColor={targetNode.color || '#000000'} delay={link.delay}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {nodes.map(node => {
        const size = node.size || 85;
        const STAGE_SIZE = (size + 50) * 2; 
        const localCenter = STAGE_SIZE / 2; 

        return (
          <div 
            key={`spread-wrapper-${node.id}`}
            style={{ position: 'absolute', left: node.x - localCenter, top: node.y - localCenter, width: STAGE_SIZE, height: STAGE_SIZE, filter: `url(#ink-bleed-${node.id})`, zIndex: 10 }}
          >
            <Stage width={STAGE_SIZE} height={STAGE_SIZE}>
              <Layer>
                <InkSpread {...node} x={localCenter} y={localCenter} onNodeClick={handleNodeClick} />
              </Layer>
            </Stage>
          </div>
        );
      })}

      <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 20 }}>
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {nodes.map(node => (
              <InkDrop key={`drop-${node.id}`} {...node} />
            ))}
          </Layer>
        </Stage>
      </div>

    </div>
  );
};

export default Main;