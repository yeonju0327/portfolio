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
      const straightX = startX + dx * t;
      const straightY = startY + dy * t;
      
      const jitter = (Math.random() - 0.5) * 5; 
      const currentX = straightX + perpx * jitter;
      const currentY = straightY + perpy * jitter;

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
      tl.fromTo(
        lineRef.current,
        { dashOffset: roughLength },
        { dashOffset: 0, duration: 1.5, ease: "none" }
      );
      return () => { tl.kill(); };
    }
  }, [roughLength, delay]);

  return (
    <Group listening={false}>
      <Line
        ref={lineRef}
        points={roughPoints} 
        // ✨ 시인성을 높이기 위해 선 굵기를 11에서 13으로 늘렸습니다.
        strokeWidth={13} 
        strokeLinearGradientStartPoint={{ x: startX, y: startY }}
        strokeLinearGradientEndPoint={{ x: endX, y: endY }}
        strokeLinearGradientColorStops={[
          0, getRGBA(startColor, 0),
          0.1, getRGBA(startColor, 1),
          0.9, getRGBA(endColor, 1),
          // ✨ 선 끝 그라데이션 꼬리 부분의 투명도를 조정했습니다. 
          // 완전히 투명하게 만들지 않고 25% 오파시티를 남겨 배경 위에서 명확하게 보이도록 합니다.
          1, getRGBA(endColor, 0.25)
        ]}
        lineCap="round"
        lineJoin="round" 
        dash={roughLength > 0 ? [roughLength, roughLength + 100] : [0, 0]}
        opacity={0} 
        listening={false}
      />
    </Group>
  );
});
Branch.displayName = 'Branch';

export default Branch;