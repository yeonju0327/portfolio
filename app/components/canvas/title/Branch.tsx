import React, { useEffect, useRef, useMemo } from 'react';
import { Group, Line } from 'react-konva';
import { gsap } from 'gsap';
import Konva from 'konva';
import { BranchProps } from './types';

const Branch: React.FC<BranchProps> = React.memo(({ startX, startY, endX, endY, startColor, endColor, delay = 0 }) => {
  const lineRef = useRef<import('konva/lib/shapes/Line').Line>(null);

  const getRGBA = (hex: string, alpha: number) => {
    const rgb = Konva.Util.getRGB(hex);
    if (!rgb) return `rgba(0,0,0,${alpha})`;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  };

  const { roughPoints, roughLength } = useMemo(() => {
    const points = [startX, startY];
    const dx = endX - startX;
    const dy = endY - startY;
    const lineLen = Math.sqrt(dx * dx + dy * dy);
    if (lineLen === 0) return { roughPoints: [startX, startY, endX, endY], roughLength: 0 };

    const segmentCount = 25; 
    const perpx = -dy / lineLen;
    const perpy = dx / lineLen;

    let totalLen = 0;
    let prevX = startX;
    let prevY = startY;

    for (let i = 1; i <= segmentCount; i++) {
      const t = i / (segmentCount + 1);
      const jitter = (Math.random() - 0.5) * 5; 
      const currentX = (startX + dx * t) + perpx * jitter;
      const currentY = (startY + dy * t) + perpy * jitter;
      points.push(currentX, currentY);
      totalLen += Math.sqrt((currentX - prevX) ** 2 + (currentY - prevY) ** 2);
      prevX = currentX;
      prevY = currentY;
    }
    points.push(endX, endY);
    totalLen += Math.sqrt((endX - prevX) ** 2 + (endY - prevY) ** 2);
    return { roughPoints: points, roughLength: totalLen };
  }, [startX, startY, endX, endY]);

  useEffect(() => {
    if (roughLength > 0 && lineRef.current) {
      const tl = gsap.timeline({ delay });
      tl.set(lineRef.current, { opacity: 0.8 }); 
      tl.fromTo(lineRef.current, { dashOffset: roughLength }, { dashOffset: 0, duration: 1.0, ease: "none" });
      return () => { tl.kill(); };
    }
  }, [roughLength, delay]);

  return (
    <Group listening={false}>
      <Line
        ref={lineRef}
        points={roughPoints} 
        strokeWidth={13} 
        strokeLinearGradientStartPoint={{ x: startX, y: startY }}
        strokeLinearGradientEndPoint={{ x: endX, y: endY }}
        strokeLinearGradientColorStops={[0, getRGBA(startColor, 0), 0.1, getRGBA(startColor, 1), 0.9, getRGBA(endColor, 1), 1, getRGBA(endColor, 0.25)]}
        lineCap="round"
        lineJoin="round" 
        dash={[roughLength, roughLength + 100]}
        opacity={0} 
        listening={false}
      />
    </Group>
  );
});
Branch.displayName = 'Branch';
export default Branch;