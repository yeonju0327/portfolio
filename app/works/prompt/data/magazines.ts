export interface MagazinePage {
  id: number;
  pageNumber: number;
  type: 'cover' | 'editorial' | 'feature' | 'gallery' | 'interview' | 'back';
  title: string;
  subtitle?: string;
  content?: string[];
  quote?: string;
  imageAccent?: string;
  tags?: string[];
  imageUrl?: string;
}

export interface MagazineIssue {
  id: number;
  vol: number;
  title: string;
  subtitle: string;
  issueDate: string;
  themeColor: string;
  accentColor: string;
  coverBg: string;
  coverImage?: string;
  description: string;
  pages: MagazinePage[];
}

const generatePages = (vol: number, totalCount: number): MagazinePage[] => {
  const pages: MagazinePage[] = [];
  for (let i = 1; i <= totalCount; i++) {
    pages.push({
      id: i,
      pageNumber: i,
      type: i === 1 ? 'cover' : i === totalCount ? 'back' : 'editorial',
      title: i === 1 ? `PROMPT Vol.0${vol}` : `Page ${i}`,
      imageUrl: `/images/magazines/${vol}/${i}.jpg`,
    });
  }
  return pages;
};

export const MAGAZINE_ISSUES: MagazineIssue[] = [
  {
    id: 1,
    vol: 1,
    title: 'ANALOG DIGITALIA',
    subtitle: '1호 PROMPT 매거진',
    issueDate: '2026.03 - Vol. 01',
    themeColor: '#C86D51',
    accentColor: '#F5DDC4',
    coverBg: '#2B2320',
    coverImage: '/images/magazines/1/1.jpg',
    description: '디지털 캔버스 위에 아날로그적 질감과 물리성을 정교하게 렌더링하는 시도들.',
    pages: generatePages(1, 14),
  },
  {
    id: 2,
    vol: 2,
    title: 'REFRACTION & GLASS',
    subtitle: '2호 PROMPT 매거진',
    issueDate: '2026.04 - Vol. 02',
    themeColor: '#4A8096',
    accentColor: '#D2ECEE',
    coverBg: '#1B2830',
    coverImage: '/images/magazines/2/1.jpg',
    description: 'WebGL 과 Three.js 셰이더를 활용한 미니멀 유리 재질과 물리 굴절 기법.',
    pages: generatePages(2, 14),
  },
  {
    id: 3,
    vol: 3,
    title: 'THE RADIAL MIND',
    subtitle: '3호 PROMPT 매거진',
    issueDate: '2026.05 - Vol. 03',
    themeColor: '#7E57C2',
    accentColor: '#EDE7F6',
    coverBg: '#21182B',
    coverImage: '/images/magazines/3/1.jpg',
    description: 'React Konva와 뷰포트 컬링으로 구현한 무한 탐색 대시보드 캔버스 구조.',
    pages: generatePages(3, 13),
  },
  {
    id: 4,
    vol: 4,
    title: 'SOUND & MOTION',
    subtitle: '4호 PROMPT 매거진',
    issueDate: '2026.06 - Vol. 04',
    themeColor: '#4CAF50',
    accentColor: '#E8F5E9',
    coverBg: '#1A291B',
    coverImage: '/images/magazines/4/1.jpg',
    description: 'Web Audio API 코드로 실시간 합성하는 유리 파쇄음과 종이 마찰음 연구.',
    pages: generatePages(4, 15),
  },
  {
    id: 5,
    vol: 5,
    title: 'THE ART OF PROMPT',
    subtitle: '5호 PROMPT 매거진',
    issueDate: '2026.07 - Vol. 05',
    themeColor: '#D81B60',
    accentColor: '#FCE4EC',
    coverBg: '#2D141E',
    coverImage: '/images/magazines/5/1.jpg',
    description: '언어가 만드는 새로운 시각적 언어와 인터랙션 프롬프트 엔지니어링 기록.',
    pages: generatePages(5, 16),
  },
];

export const getMagazineById = (id: number): MagazineIssue | undefined => {
  return MAGAZINE_ISSUES.find(issue => issue.id === id);
};
