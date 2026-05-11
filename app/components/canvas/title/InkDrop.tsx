import React, { useEffect, useRef } from 'react';
import { Circle } from 'react-konva';
import { gsap } from 'gsap';
import { NodeProps } from './types';

const InkDrop = React.memo(({ x, y, color = '#000000', size = 85, delay = 0 }: NodeProps) => {
  const dropRef = useRef<import('konva/lib/shapes/Circle').Circle>(null);
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

export default InkDrop;