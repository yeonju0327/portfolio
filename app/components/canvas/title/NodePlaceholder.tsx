import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Group, Circle, Path } from 'react-konva';
import { gsap } from 'gsap';

interface NodePlaceholderProps {
  x: number;
  y: number;
  color: string;
  iconType: string;
  targetDelay: number; 
  onClick: () => void;
  isFading?: boolean; 
  isDraggingActive?: boolean; 
  isAutoExploring?: boolean; // ✨ 상호작용 잠금 플래그
}

const NodePlaceholder: React.FC<NodePlaceholderProps> = ({ 
  x, y, color, iconType, targetDelay, onClick, isFading, isDraggingActive, isAutoExploring 
}) => {
  const groupRef = useRef<import('konva/lib/Group').Group>(null);
  const dashedRingRef = useRef<import('konva/lib/shapes/Circle').Circle>(null);
  const glowRef = useRef<import('konva/lib/shapes/Circle').Circle>(null);
  const iconRef = useRef<import('konva/lib/Group').Group>(null);
  
  const [isReady, setIsReady] = useState(false);
  const isFadingRef = useRef(false);
  
  // 드래그 중이거나 자동 탐색 중이면 인터랙션 차단
  const disableInteraction = isDraggingActive || isAutoExploring;

  const iconPathData = useMemo(() => {
    switch (iconType) {
      case 'about': return 'M -7 -6 A 7 7 0 1 1 7 -6 A 7 7 0 1 1 -7 -6 M -13 14 C -13 2 13 2 13 14';
      case 'project': return 'M -14 -10 L 14 -10 L 14 6 L -14 6 Z M -5 6 L -7 14 L 7 14 L 5 6';
      case 'skill': return 'M 0 -13 L 3 -4 L 13 -4 L 5 2 L 8 12 L 0 6 L -8 12 L -5 2 L -13 -4 L -3 -4 Z';
      case 'plus': default: return 'M -12 0 L 12 0 M 0 -12 L 0 12';
    }
  }, [iconType]);

  useEffect(() => {
    if (groupRef.current && dashedRingRef.current && glowRef.current) {
      gsap.fromTo(groupRef.current, 
        { scaleX: 0, scaleY: 0, opacity: 0 }, 
        { 
          scaleX: 1, scaleY: 1, opacity: 1, duration: 1, delay: 1.8, ease: "back.out(1.5)",
          onComplete: () => { 
            setIsReady(true); 
          } 
        }
      );

      gsap.to(dashedRingRef.current, { rotation: 360, duration: 15, repeat: -1, ease: "none" });
      gsap.to(glowRef.current, { scaleX: 1.15, scaleY: 1.15, opacity: 0.35, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }
  }, []);

  useEffect(() => {
    if (isFading && !isFadingRef.current && groupRef.current) {
      isFadingRef.current = true;
      
      const fadeOutDelay = (targetDelay + 0.8) + 0.55;

      gsap.to(groupRef.current, {
        opacity: 0, 
        scaleX: 1.1, 
        scaleY: 1.1, 
        duration: 0.6, 
        delay: fadeOutDelay, 
        ease: "power2.inOut",
      });
    }
  }, [isFading, targetDelay]);

  const handleSafeClick = (e: any) => {
    // 자동 탐색 등 비활성 조건 검증 강화
    if (!isReady || disableInteraction || isFading || isFadingRef.current) {
      if (e) e.cancelBubble = true;
      return;
    }
    onClick();
  };

  const handleHoverIn = () => {
    if (!isReady || disableInteraction || isFading) return;
    document.body.style.cursor = 'pointer';
    gsap.to(groupRef.current, { scaleX: 1.15, scaleY: 1.15, duration: 0.3, ease: "power2.out" });
    gsap.to(iconRef.current, { scaleX: 1.1, scaleY: 1.1, duration: 0.3 });
  };

  const handleMouseLeave = () => {
    document.body.style.cursor = 'default';
    if (!isReady || disableInteraction || isFading) return;
    gsap.to(groupRef.current, { scaleX: 1, scaleY: 1, duration: 0.3, ease: "power2.out" });
    gsap.to(iconRef.current, { scaleX: 1, scaleY: 1, duration: 0.3 });
  };

  return (
    <Group 
      ref={groupRef} x={x} y={y} 
      listening={isReady && !isFading && !disableInteraction} // 이벤트 리스너 차단
      onClick={handleSafeClick} 
      onTap={handleSafeClick}
      onMouseEnter={handleHoverIn} 
      onMouseLeave={handleMouseLeave}
    >
      <Circle radius={35} fill="transparent" />
      <Circle ref={glowRef} radius={28} fill={color} opacity={0.15} />
      <Circle ref={dashedRingRef} radius={28} stroke={color} strokeWidth={2.5} dash={[8, 8]} opacity={0.8} />
      <Group ref={iconRef}>
        <Path data={iconPathData} stroke={color} strokeWidth={3} lineCap="round" lineJoin="round" opacity={0.9} />
      </Group>
    </Group>
  );
};

export default NodePlaceholder;