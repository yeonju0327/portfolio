import { NodeProps } from './types';

const VIRTUAL_SIZE = 4000;
export const CENTER = VIRTUAL_SIZE / 2;

export type RawNodeData = {
  id: string;
  color: string;
  img: string;
  icon: string;
  caption: string;
  children: string[];
  description?: string;
};

export const RAW_TREE: Record<string, RawNodeData> = {
  'root': { id: 'root', color: '#2C2C2C', img: '/images/node-image.jpg', icon: 'about', caption: 'Profile & Skills', children: ['works-web', 'works-game', 'works-data', 'works-design'], description: '안녕하세요, 인터랙티브 웹 개발자입니다.' },
  'works-web': { id: 'works-web', color: '#E08E6D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Web Projects', children: ['web-1', 'web-2'], description: 'Next.js와 GSAP을 활용한 현대적인 웹 프로젝트 모음입니다.' },
  'works-game': { id: 'works-game', color: '#B5749E', img: '/images/node-image2.jpg', icon: 'project', caption: 'Game Projects', children: ['game-1'], description: 'Unity와 Canvas API를 이용한 게임 개발 기록입니다.' },
  'works-data': { id: 'works-data', color: '#6E88B5', img: '/images/node-image.jpg', icon: 'project', caption: 'Data Vis', children: ['data-1'], description: '복잡한 데이터를 직관적으로 풀어낸 시각화 프로젝트입니다.' },
  'works-design': { id: 'works-design', color: '#DDA05B', img: '/images/node-image3.jpg', icon: 'project', caption: 'Design', children: ['design-1', 'design-2'], description: '사용자 경험을 최우선으로 고려한 UI/UX 디자인 작업물입니다.' },
  'web-1': { id: 'web-1', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'Portfolio Site', children: [], description: '현재 보고 계시는 인터랙티브 노드 맵 포트폴리오입니다.' },
  'web-2': { id: 'web-2', color: '#F2A68D', img: '/images/node-image5.jpg', icon: 'project', caption: 'E-commerce', children: [], description: '반응형 디자인이 적용된 쇼핑몰 웹사이트입니다.' },
  'game-1': { id: 'game-1', color: '#C88AB2', img: '/images/node-image2.jpg', icon: 'project', caption: '2D Platformer', children: [], description: '부드러운 조작감을 자랑하는 2D 플랫포머 게임입니다.' },
  'data-1': { id: 'data-1', color: '#859FCF', img: '/images/node-image.jpg', icon: 'project', caption: 'COVID Tracker', children: [], description: '전 세계 코로나 확산 추이를 시각화한 대시보드입니다.' },
  'design-1': { id: 'design-1', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'Brand Identity', children: [], description: '가상의 카페 브랜드를 위한 로고 및 아이덴티티 디자인입니다.' },
  'design-2': { id: 'design-2', color: '#F0B675', img: '/images/node-image3.jpg', icon: 'project', caption: 'UI/UX App', children: [], description: '사용자 친화적인 일정 관리 모바일 앱 디자인입니다.' },
};

export type MapData = Record<string, NodeProps & { children: string[], icon: string, caption?: string, description?: string }>;

export const buildRadialMap = (): MapData => {
  const map: MapData = {} as MapData;
  const traverse = (nodeId: string, depth: number, angle: number, angleRange: number, cx: number, cy: number) => {
    const raw = RAW_TREE[nodeId];
    if (!raw) return;
    let size = 110, radiusX = 0, radiusY = 0;
    
    if (depth === 0) { size = 110; radiusX = 0; radiusY = 0; } 
    else if (depth === 1) { size = 85; radiusX = 480; radiusY = 310; } 
    else if (depth === 2) { size = 65; radiusX = 320; radiusY = 210; }

    const x = depth === 0 ? cx : cx + Math.cos(angle) * radiusX;
    const y = depth === 0 ? cy : cy + Math.sin(angle) * radiusY;
    map[nodeId] = { ...raw, x, y, size, delay: depth === 0 ? 0 : 0.2 };
    
    const childrenCount = raw.children.length;
    if (childrenCount > 0) {
      const step = depth === 0 ? (Math.PI * 2) / childrenCount : angleRange / Math.max(1, childrenCount);
      const startAngle = depth === 0 ? -Math.PI / 4 : angle - angleRange / 2 + step / 2;
      raw.children.forEach((childId, idx) => {
        const childAngle = startAngle + idx * step;
        traverse(childId, depth + 1, childAngle, Math.PI / 1.5, x, y);
      });
    }
  };
  traverse('root', 0, 0, Math.PI * 2, CENTER, CENTER);
  return map;
};

export const PORTFOLIO_MAP = buildRadialMap();

// 아이콘 SVG 데이터
export const getIconPath = (icon?: string) => {
  switch (icon) {
    case 'about': return 'M -7 -6 A 7 7 0 1 1 7 -6 A 7 7 0 1 1 -7 -6 M -13 14 C -13 2 13 2 13 14';
    case 'project': return 'M -14 -10 L 14 -10 L 14 6 L -14 6 Z M -5 6 L -7 14 L 7 14 L 5 6';
    case 'skill': return 'M 0 -13 L 3 -4 L 13 -4 L 5 2 L 8 12 L 0 6 L -8 12 L -5 2 L -13 -4 L -3 -4 Z';
    case 'plus': default: return 'M -12 0 L 12 0 M 0 -12 L 0 12';
  }
};