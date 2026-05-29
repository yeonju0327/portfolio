import { NodeProps } from './types';

const VIRTUAL_SIZE = 5000;
export const CENTER = VIRTUAL_SIZE / 2;

export type RawNodeData = {
  id: string;
  color: string;
  img: string;
  icon: string;
  caption: string;
  children: string[];
  description?: string;
  tags?: string[];
  linkUrl?: string;
};

export const RAW_TREE: Record<string, RawNodeData> = {
  'root': { id: 'root', color: '#2C2C2C', img: '/images/node-image.jpg', icon: 'about', caption: 'Profile & Skills', children: ['works-web', 'works-game', 'works-data', 'works-design'], description: '안녕하세요, 디지털과 아날로그의 경계를 탐구하는 아트&테크놀로지 개발자 김연주입니다.', tags: ['React', 'Next.js', 'TypeScript', 'GSAP', 'HTML5 Canvas'], linkUrl: 'https://github.com/yeonju0327' },
  'works-web': { id: 'works-web', color: '#E08E6D', img: '/images/node-image.jpg', icon: 'project', caption: 'Web Projects', children: ['web-2'], description: 'Next.js와 GSAP을 활용한 현대적인 웹 프로젝트 모음입니다.', tags: ['React', 'Next.js', 'CSS Modules'], linkUrl: '' },
  'works-game': { id: 'works-game', color: '#B5749E', img: '/images/node-image.jpg', icon: 'project', caption: 'Game Projects', children: ['game-1', 'web-1'], description: 'Unity와 Canvas API를 이용한 게임 개발 기록입니다.', tags: ['Unity', 'C#', 'Crayon Texture Engine'], linkUrl: '' },
  'works-data': { id: 'works-data', color: '#6E88B5', img: '/images/node-image.jpg', icon: 'project', caption: 'Data Vis', children: ['data-1'], description: '복잡한 데이터를 직관적으로 풀어낸 시각화 프로젝트입니다.', tags: ['D3.js', 'SVG Animation', 'Data Analysis'], linkUrl: '' },
  'works-design': { id: 'works-design', color: '#DDA05B', img: '/images/node-image.jpg', icon: 'project', caption: 'Design', children: ['design-1', 'design-2'], description: '사용자 경험을 최우선으로 고려한 UI/UX 디자인 작업물입니다.', tags: ['Figma', 'UI/UX', 'Interaction Design'], linkUrl: '' },
  'web-1': { id: 'web-1', color: '#80DEEA', img: '/images/node-image.jpg', icon: 'project', caption: '#1_BlackJack', children: [], description: '두께감 있는 3D 유리 카드 블록이 빛을 굴절시키는 블랙잭 게임입니다. WebGL의 뎁스 정렬 최적화와 물리 기반 유리 재질을 구현했습니다.', tags: ['Three.js', 'WebGL', 'GSAP', 'Next.js', 'ShaderMaterial'], linkUrl: '/works/blackjack' },
  'web-2': { id: 'web-2', color: '#F2A68D', img: '/images/node-image.jpg', icon: 'project', caption: 'E-commerce', children: [], description: '반응형 디자인이 적용된 쇼핑몰 웹사이트입니다. 아날로그 룩앤필의 찢어진 종이 메타포 카드 결제 UI를 탑재했습니다.', tags: ['React', 'Redux Toolkit', 'TailwindCSS', 'Node.js'], linkUrl: 'https://github.com/yeonju0327/e-commerce' },
  'game-1': { id: 'game-1', color: '#C88AB2', img: '/images/node-image.jpg', icon: 'project', caption: '2D Platformer', children: [], description: '부드러운 조작감을 자랑하는 2D 플랫포머 게임입니다. 손그림 스타일의 텍스처 맵과 잉크 번짐 파티클 효과를 자체 구현했습니다.', tags: ['Unity 2D', 'C#', 'Spine 2D Animation'], linkUrl: 'https://github.com/yeonju0327/crayon-platformer' },
  'data-1': { id: 'data-1', color: '#859FCF', img: '/images/node-image.jpg', icon: 'project', caption: 'COVID Tracker', children: [], description: '전 세계 코로나 확산 추이를 시간의 흐름에 따라 잉크가 캔버스에 떨어져 퍼지는 애니메이션으로 시각화한 대시보드입니다.', tags: ['D3.js', 'SVG Filter', 'Vanilla JS'], linkUrl: 'https://github.com/yeonju0327/covid-visualizer' },
  'design-1': { id: 'design-1', color: '#F0B675', img: '/images/node-image.jpg', icon: 'project', caption: 'Brand Identity', children: [], description: '가상의 아날로그 카페 브랜드를 위한 로고, 컵 슬라이더 홀더, 비정형 포스트잇 패키지 및 브랜딩 가이드 디자인입니다.', tags: ['Adobe Illustrator', 'Branding', 'Package Design'], linkUrl: 'https://behance.net/yeonju-cafe' },
  'design-2': { id: 'design-2', color: '#F0B675', img: '/images/node-image.jpg', icon: 'project', caption: 'UI/UX App', children: [], description: '사용자 친화적인 일정 관리 모바일 앱 디자인입니다. 다이어리 꾸미기 감성을 살린 손그림 아이콘 테마가 특징입니다.', tags: ['Figma', 'UI/UX Design', 'Prototype Interaction'], linkUrl: 'https://behance.net/yeonju-diary-app' },
};

export type MapData = Record<string, NodeProps & { children: string[], icon: string, caption?: string, description?: string, tags?: string[], linkUrl?: string }>;

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