'use client'; 

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Circle, Ring, Group, Image as KonvaImage, Line, Path } from 'react-konva';
import { gsap } from 'gsap';
import useImage from 'use-image';
import Konva from 'konva';

export interface NodeProps {
  id: string;
  x: number;
  y: number;
  color?: string; 
  size?: number;  
  img?: string;   
  delay?: number; 
}

interface BranchProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startColor: string;
  endColor: string;
  delay?: number;
}

const getEdgePoints = (n1: NodeProps, n2: NodeProps) => {
  const dx = n2.x - n1.x;
  const dy = n2.y - n1.y;
  const angle = Math.atan2(dy, dx);
  const r1 = (n1.size || 85) * 0.5; 
  const r2 = (n2.size || 85) * 0.5;

  return {
    startX: n1.x + Math.cos(angle) * r1,
    startY: n1.y + Math.sin(angle) * r1,
    endX: n2.x - Math.cos(angle) * r2,
    endY: n2.y - Math.sin(angle) * r2,
  };
};

const InkFilter = React.memo(({ id }: { id: string }) => (
  <filter id={`ink-bleed-${id}`}>
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
    <feDisplacementMap id={`disp-${id}`} in="SourceGraphic" in2="noise" scale="20" xChannelSelector="R" yChannelSelector="G" />
  </filter>
));
InkFilter.displayName = 'InkFilter';

const Branch = React.memo(({ startX, startY, endX, endY, startColor, endColor, delay = 0 }: BranchProps) => {
  const lineRef = useRef<Konva.Path>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);

  const pathData = useMemo(() => {
    const midCount = 6; 
    const variation = 18; 

    const dx = endX - startX;
    const dy = endY - startY;
    const lineLen = Math.sqrt(dx * dx + dy * dy);

    if (lineLen === 0) return `M ${startX} ${startY} L ${endX} ${endY}`;

    const perpx = -dy / lineLen;
    const perpy = dx / lineLen;

    const midPoints = [];
    for (let i = 1; i <= midCount; i++) {
      const t = i / (midCount + 1);
      const straightMidX = startX + dx * t;
      const straightMidY = startY + dy * t;
      const offset = (Math.random() - 0.5) * variation * 2;
      midPoints.push({ x: straightMidX + perpx * offset, y: straightMidY + perpy * offset });
    }

    let data = `M ${startX} ${startY}`;
    for (let i = 0; i < midPoints.length; i += 3) {
      const mp1 = midPoints[i];
      const mp2 = midPoints[i + 1] || midPoints[i];
      const mp3 = midPoints[i + 2] || midPoints[i];
      if (mp1 && mp2 && mp3) {
        data += ` C ${mp1.x} ${mp1.y} ${mp2.x} ${mp2.y} ${mp3.x} ${mp3.y}`;
      }
    }
    const lastMid = midPoints[midPoints.length - 1];
    if (lastMid) {
        data += ` C ${lastMid.x} ${lastMid.y} ${lastMid.x} ${lastMid.y} ${endX} ${endY}`;
    } else {
        data += ` L ${endX} ${endY}`;
    }

    return data;
  }, [startX, startY, endX, endY]);

  useEffect(() => {
    if (lineRef.current) {
        setPathLength(lineRef.current.getLength());
    }
  }, [lineRef, pathData]);

  useEffect(() => {
    if (lineRef.current && pathLength !== null) {
      const tl = gsap.timeline({ delay });
      
      tl.set(lineRef.current, { opacity: 1 }); 
      tl.fromTo(
        lineRef.current,
        { dashOffset: pathLength },
        { dashOffset: 0, duration: 1.5, ease: "none" }
      );
      return () => { tl.kill(); };
    }
  }, [pathLength, delay]);

  return (
    <Group listening={false}>
      <Path
        ref={lineRef}
        data={pathData} 
        strokeWidth={8} 
        strokeLinearGradientStartPoint={{ x: startX, y: startY }}
        strokeLinearGradientEndPoint={{ x: endX, y: endY }}
        strokeLinearGradientColorStops={[0, startColor, 1, endColor]}
        lineCap="round"
        lineJoin="round"
        dash={pathLength !== null ? [pathLength, pathLength + 100] : [0, 0]}
        opacity={0} 
        listening={false}
      />
    </Group>
  );
});
Branch.displayName = 'Branch';

const InkDrop = React.memo(({ x, y, color = '#000000', size = 85, delay = 0 }: NodeProps) => {
  const dropRef = useRef<Konva.Circle>(null);
  const baseDropRadius = (7 * size) / 85; 

  useEffect(() => {
    const tl = gsap.timeline({ delay });

    tl.set(dropRef.current, { x, y: y - 400, radius: baseDropRadius, scaleY: 3.2, opacity: 0 });
    tl.to(dropRef.current, { opacity: 1, duration: 0.25, ease: "power1.inOut" }, 0);
    tl.to(dropRef.current, { y: y, duration: 0.8, ease: "power2.in" }, 0); 
    tl.to(dropRef.current, { opacity: 0, duration: 0.05 });
    
    return () => { tl.kill(); };
  }, [x, y, size, delay]);

  return <Circle ref={dropRef} x={x} y={y - 400} fill={color} opacity={0} listening={false} />;
});
InkDrop.displayName = 'InkDrop';

const InkSpread = React.memo(({ 
  id, x, y, color = '#000000', size = 85, img = '/images/node-image.jpg', delay = 0, onNodeClick
}: NodeProps & { onNodeClick?: (id: string) => void }) => {
  
  const mainGroupRef = useRef<Konva.Group>(null);
  const inkSpreadRef = useRef<Konva.Ring>(null);
  const imageRef = useRef<Konva.Image>(null);
  
  const [filterScaleTween, setFilterScaleTween] = useState<gsap.core.Tween | null>(null);
  const hoverProxy = useRef({ inner: 0, filterScale: 20 });
  const [isReady, setIsReady] = useState(false);
  const [image] = useImage(img);

  const HOVER_INNER_RADIUS = size - 15; 
  const CLIP_RADIUS = size - 5;         
  const IMG_SIZE = CLIP_RADIUS * 2;     

  const rgb = Konva.Util.getRGB(color) || { r: 0, g: 0, b: 0 };
  const { r, g, b } = rgb;

  const initialSolidStop = 0.75; 
  const initialFadeWidth = 1 - initialSolidStop; 
  
  const initialMidStart = initialSolidStop + initialFadeWidth * 0.3; 
  const initialMidEnd = initialSolidStop + initialFadeWidth * 0.7;   

  useEffect(() => {
    const tl = gsap.timeline({ delay });
    
    tl.set(mainGroupRef.current, { scaleX: 0, scaleY: 0, opacity: 0 });
    tl.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
    tl.set(imageRef.current, { opacity: 0 });

    tl.to(mainGroupRef.current, { 
      opacity: 1, scaleX: 1, scaleY: 1, duration: 2.5, ease: "power2.out", 
      delay: 0.8, // 드롭이 바닥에 닿는 0.8초 후 번짐 시작
      onComplete: () => setIsReady(true)
    });
    
    return () => { tl.kill(); };
  }, [size, delay]);

  const handleMouseEnter = () => {
    if (!isReady) return;
    document.body.style.cursor = 'pointer'; 

    gsap.killTweensOf([mainGroupRef.current, imageRef.current]);

    gsap.to(mainGroupRef.current, { scaleX: 1.15, scaleY: 1.15, duration: 0.25, ease: "power2.out" });
    gsap.to(imageRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" });
    
    const filterMap = document.getElementById(`disp-${id}`);

    if (filterMap) {
      const tween = gsap.to(hoverProxy.current, {
        inner: HOVER_INNER_RADIUS, 
        filterScale: 0,      
        duration: 0.25,      
        ease: "power2.out",
        onUpdate: () => {
          inkSpreadRef.current?.innerRadius(hoverProxy.current.inner);
          filterMap.setAttribute('scale', hoverProxy.current.filterScale.toString());
          
          const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS; 
          const smoothProgress = gsap.parseEase("power1.out")(progress);
          
          const solidStop = 0.75 + (0.24 * smoothProgress); 
          const fadeWidth = 1 - solidStop;

          const midStart = solidStop + fadeWidth * 0.3;
          const midEnd = solidStop + fadeWidth * 0.7;

          inkSpreadRef.current?.fillRadialGradientColorStops([
            0, color, 
            solidStop, color, 
            midStart, `rgba(${r},${g},${b},0.7)`, 
            midEnd, `rgba(${r},${g},${b},0.25)`,  
            1, 'transparent'
          ]);
        }
      });
      setFilterScaleTween(tween);
    }
  };

  const handleMouseLeave = () => {
    if (!isReady) return;
    document.body.style.cursor = 'default';

    gsap.killTweensOf([mainGroupRef.current, imageRef.current]);
    if (filterScaleTween) filterScaleTween.kill();

    gsap.to(mainGroupRef.current, { scaleX: 1, scaleY: 1, duration: 0.35, ease: "power3.out" });
    gsap.to(imageRef.current, { opacity: 0, duration: 0.35, ease: "power3.out" });
    
    const filterMap = document.getElementById(`disp-${id}`);

    if (filterMap) {
      gsap.to(hoverProxy.current, {
        inner: 0, 
        filterScale: 20, 
        duration: 0.35,
        ease: "power3.out",
        onUpdate: () => {
          inkSpreadRef.current?.innerRadius(hoverProxy.current.inner);
          filterMap.setAttribute('scale', hoverProxy.current.filterScale.toString());
          
          const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS; 
          const smoothProgress = gsap.parseEase("power1.out")(progress);

          const solidStop = 0.75 + (0.24 * smoothProgress); 
          const fadeWidth = 1 - solidStop;

          const midStart = solidStop + fadeWidth * 0.3;
          const midEnd = solidStop + fadeWidth * 0.7;

          inkSpreadRef.current?.fillRadialGradientColorStops([
            0, color, 
            solidStop, color, 
            midStart, `rgba(${r},${g},${b},0.7)`,
            midEnd, `rgba(${r},${g},${b},0.25)`,
            1, 'transparent'
          ]);
        }
      });
    }
    setFilterScaleTween(null);
  };

  return (
    <Group x={x} y={y}>
      <Group ref={mainGroupRef} scaleX={0} scaleY={0} opacity={0} listening={false}>
        
        <Group clipFunc={(ctx) => ctx.arc(0, 0, CLIP_RADIUS, 0, Math.PI * 2)} listening={false}>
          <KonvaImage 
            ref={imageRef} image={image} x={0} y={0} 
            width={IMG_SIZE} height={IMG_SIZE} offsetX={CLIP_RADIUS} offsetY={CLIP_RADIUS} 
            opacity={0} listening={false} 
          />
        </Group>

        <Ring 
          ref={inkSpreadRef} x={0} y={0} innerRadius={0} outerRadius={size} 
          fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0}
          fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientEndRadius={size}
          fillRadialGradientColorStops={[
            0, color, 
            initialSolidStop, color, 
            initialMidStart, `rgba(${r},${g},${b},0.7)`, 
            initialMidEnd, `rgba(${r},${g},${b},0.25)`, 
            1, 'transparent'
          ]}
          listening={false} 
        />
      </Group>

      <Circle 
        x={0} 
        y={0} 
        radius={size + 35} 
        fill="rgba(0,0,0,0)" 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave} 
        onClick={() => isReady && onNodeClick?.(id)}
        onTap={() => isReady && onNodeClick?.(id)} 
      />
    </Group>
  );
});
InkSpread.displayName = 'InkSpread';

const NEXT_NODES_PRESETS = [
  { dx: 300, dy: -150, size: 65, color: '#FF5733', img: '/images/node-image2.jpg' },
  { dx: -280, dy: -120, size: 75, color: '#33A1FF', img: '/images/node-image3.jpg' },
  { dx: 180, dy: 250, size: 60, color: '#28B463', img: '/images/node-image4.jpg' },
  { dx: -200, dy: 220, size: 70, color: '#8E44AD', img: '/images/node-image5.jpg' },
];

const MindMapAnimation = () => {
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
      delay: 0.5 // ✨ 0.5초로 변경 완료
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

export default MindMapAnimation;