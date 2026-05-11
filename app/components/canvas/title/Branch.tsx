import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Group, Path } from 'react-konva';
import { gsap } from 'gsap';
import { BranchProps } from './types';

const Branch = React.memo(({ startX, startY, endX, endY, startColor, endColor, delay = 0 }: BranchProps) => {
  const lineRef = useRef<import('konva/lib/shapes/Path').Path>(null);
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

export default Branch;