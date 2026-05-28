import React, { useEffect, useRef, useMemo, useState } from 'react';
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
  isAutoExploring?: boolean; 
  isRestored?: boolean;
}

const NodePlaceholder: React.FC<NodePlaceholderProps> = ({ 
  x, y, color, iconType, targetDelay, onClick, isFading, isDraggingActive, isAutoExploring, isRestored = false 
}) => {
  const groupRef = useRef<SVGGElement>(null);
  const dashedRingRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const iconRef = useRef<SVGGElement>(null);
  
  const [isReady, setIsReady] = useState(false);
  const isFadingRef = useRef(false);
  
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
      if (isRestored) {
        gsap.set(groupRef.current, { scale: 1, opacity: 1, transformOrigin: "50% 50%" });
        setIsReady(true);
      } else {
        gsap.fromTo(groupRef.current, 
          { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, 
          { 
            scale: 1, opacity: 1, duration: 1, delay: targetDelay, ease: "back.out(1.5)",
            onComplete: () => { setIsReady(true); } 
          }
        );
      }

      gsap.to(dashedRingRef.current, { rotation: 360, duration: 15, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
      gsap.to(glowRef.current, { scale: 1.15, opacity: 0.35, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 50%" });
    }
  }, [targetDelay, isRestored]);

  useEffect(() => {
    if (isFading && groupRef.current) {
      if (isRestored) {
        gsap.set(groupRef.current, { opacity: 0, scale: 1.1, transformOrigin: "50% 50%" });
        isFadingRef.current = true;
      } else if (!isFadingRef.current) {
        isFadingRef.current = true;
        const fadeOutDelay = (targetDelay + 0.8) + 0.55;
        gsap.to(groupRef.current, {
          opacity: 0, 
          scale: 1.1, 
          duration: 0.6, 
          delay: fadeOutDelay, 
          ease: "power2.inOut",
          transformOrigin: "50% 50%"
        });
      }
    }
  }, [isFading, targetDelay, isRestored]);

  const handleSafeClick = (e: React.MouseEvent) => {
    if (!isReady || disableInteraction || isFading || isFadingRef.current) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleHoverIn = () => {
    if (!isReady || disableInteraction || isFading) return;
    document.body.setAttribute('data-cursor', 'pointer');
    gsap.to(groupRef.current, { scale: 1.15, duration: 0.3, ease: "power2.out", transformOrigin: "50% 50%" });
    gsap.to(iconRef.current, { scale: 1.1, duration: 0.3, transformOrigin: "50% 50%" });
  };

  const handleMouseLeave = () => {
    document.body.removeAttribute('data-cursor');
    if (!isReady || disableInteraction || isFading) return;
    gsap.to(groupRef.current, { scale: 1, duration: 0.3, ease: "power2.out", transformOrigin: "50% 50%" });
    gsap.to(iconRef.current, { scale: 1, duration: 0.3, transformOrigin: "50% 50%" });
  };

  return (
    <svg 
      width="110" 
      height="110" 
      style={{ pointerEvents: isReady && !isFading && !disableInteraction ? 'auto' : 'none', overflow: 'visible' }}
      onClick={handleSafeClick}
    >
      <g transform="translate(55, 55)">
        <g 
          ref={groupRef}
          onMouseEnter={handleHoverIn} 
          onMouseLeave={handleMouseLeave}
          style={{ 
            cursor: 'pointer', 
            transformOrigin: 'center center',
          }}
          // GSAP useEffect 실행 전 1프레임 플래시 방지: SVG opacity 어트리뷰트로 초기 숨김
          // (GSAP은 style.opacity를 덮어쓰고, transform은 GSAP이 어트리뷰트로 관리하므로 분리)
          opacity={isRestored ? 1 : 0}
        >
          {/* Hitbox */}
          <circle r={35} fill="transparent" />
          {/* Glow */}
          <circle ref={glowRef} r={28} fill={color} opacity={0.15} style={{ transformOrigin: 'center center' }} />
          {/* Dashed Ring */}
          <circle ref={dashedRingRef} r={28} stroke={color} strokeWidth={2.5} strokeDasharray="8 8" fill="none" opacity={0.8} style={{ transformOrigin: 'center center' }} />
          {/* Icon */}
          <g ref={iconRef} style={{ transformOrigin: 'center center' }}>
            <path d={iconPathData} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default NodePlaceholder;