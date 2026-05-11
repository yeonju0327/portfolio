export interface NodeProps {
  id: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  img?: string;
  delay?: number;
}

export interface BranchProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startColor: string;
  endColor: string;
  delay?: number;
}
