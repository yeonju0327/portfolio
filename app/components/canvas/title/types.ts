export interface NodeProps {
  id: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  img?: string;
  delay?: number;
  caption?: string; // 추가된 캡션 속성
  tags?: string[]; // 추가된 기술 스택 태그 속성
  linkUrl?: string; // 추가된 프로젝트 외부 링크 속성
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