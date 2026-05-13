export interface NodeProps {
  id: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  img?: string;
  delay?: number;
  caption?: string; // 추가된 캡션 속성
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