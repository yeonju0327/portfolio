import { NodeProps } from './types';

export const getEdgePoints = (n1: NodeProps, n2: NodeProps) => {
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