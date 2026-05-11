import React, { useEffect, useRef } from 'react';
import { Group, Circle } from 'react-konva';
import { gsap } from 'gsap';
import { NodeProps } from './types';
import Konva from 'konva';

const InkDrop = React.memo(({ x, y, color = '#000000', size = 85, delay = 0 }: NodeProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const mainDropRef = useRef<Konva.Circle>(null);
  const highlightRef = useRef<Konva.Circle>(null); // 컴팩트한 하이라이트 하나만 사용
  
  const baseDropRadius = (6.0 * size) / 85; 
  const startYOffset = 250; 

  useEffect(() => {
    if (!groupRef.current) return;

    const tl = gsap.timeline({ delay });

    tl.set(groupRef.current, { 
      x, 
      y: y - startYOffset, 
      scaleY: 1.5, 
      opacity: 0 
    });

    tl.to(groupRef.current, { 
      opacity: 1, 
      duration: 0.15, 
      ease: "power1.inOut" 
    }, 0);

    tl.to(groupRef.current, { 
      y: y, 
      duration: 0.8, 
      ease: "power2.in" 
    }, 0); 

    tl.to(groupRef.current, {
      scaleY: 1.2, 
      duration: 0.4,
      ease: "sine.inOut"
    }, 0);

    tl.to(groupRef.current, {
      scaleY: 1.6, 
      duration: 0.4,
      ease: "sine.inOut"
    }, 0.4);

    tl.to(groupRef.current, { 
      opacity: 0, 
      duration: 0.05 
    });
    
    return () => { tl.kill(); };
  }, [x, y, size, delay, startYOffset]);

  return (
    <Group ref={groupRef} listening={false}>
      {/* 1. 메인 물방울 본체 */}
      <Circle 
        ref={mainDropRef}
        radius={baseDropRadius}
        fill={color}
        opacity={0.85}
        stroke={color}
        strokeWidth={0.5}
      />
      
      {/* 2. ✨ 컴팩트 하이라이트 (10시 방향 고정)
          넓은 확산 광택을 제거하고, 10시 방향에만 작고 선명한 빛을 배치 */}
      <Circle 
        ref={highlightRef}
        // ✨ 위치 조정: 좌측 상단 (10시 방향)
        x={-baseDropRadius * 0.45} 
        y={-baseDropRadius * 0.5} 
        radius={baseDropRadius * 0.3} // 범위를 컴팩트하게 축소
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={baseDropRadius * 0.3}
        fillRadialGradientColorStops={[
          // 선명도를 위해 투명도를 조절 (은은하지만 확실하게)
          0, 'rgba(255, 255, 255, 0.4)', // 중심부는 40% 투명도
          1, 'rgba(255, 255, 255, 0)' // 외곽은 완전 투명하게
        ]}
      />
    </Group>
  );
});

InkDrop.displayName = 'InkDrop';

export default InkDrop;