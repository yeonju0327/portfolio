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
  description: string;
  pages: MagazinePage[];
}

export const MAGAZINE_ISSUES: MagazineIssue[] = [
  {
    id: 1,
    vol: 1,
    title: 'ANALOG DIGITALIA',
    subtitle: '픽셀 위에 피어난 종이의 온기',
    issueDate: '2026.03 - Vol. 01',
    themeColor: '#C86D51',
    accentColor: '#F5DDC4',
    coverBg: '#2B2320',
    description: '디지털 캔버스 위에 아날로그적 질감과 물리성을 정교하게 렌더링하는 시도들.',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        type: 'cover',
        title: 'PROMPT',
        subtitle: 'Vol. 01 | ANALOG DIGITALIA',
        content: ['The Seamless Blend of Warm Analog & Digital Precision'],
        imageAccent: '#C86D51',
      },
      {
        id: 2,
        pageNumber: 2,
        type: 'editorial',
        title: 'EDITORIAL',
        subtitle: '디지털에 불어넣는 물리적 숨결',
        content: [
          '차가운 픽셀 격자 위에서 우리는 따뜻한 촉감을 그립니다.',
          '손 끝에 닿는 거친 종이 엣지, 미세한 크레용 가루, 그리고 잉크 번짐.',
          '이 잡지는 웹 인터랙션이 예술적 경험이 되는 과정을 기록합니다.'
        ],
        quote: '"코드는 직조기이고, 스크린은 캔버스다."',
      },
      {
        id: 3,
        pageNumber: 3,
        type: 'feature',
        title: 'CRAYON SHADER ENGINE',
        subtitle: 'SVG Displacement & Noise',
        content: [
          '수학적으로 계산된 프랙탈 노이즈(Fractal Noise)를 사용하여 브라우저 렌더링 파이프라인에 불규칙성을 주입합니다.',
          '0과 1의 딱딱함 대신, 연필심이 깎여나가며 생기는 아날로그 손맛을 완성합니다.'
        ],
        tags: ['SVG Filter', 'feTurbulence', 'Analog UI'],
      },
      {
        id: 4,
        pageNumber: 4,
        type: 'gallery',
        title: 'TEXTURE ARCHIVE',
        subtitle: '종이 질감 팔레트 01-04',
        content: [
          '01. Kraft Paper (크라프트 종이 220g)',
          '02. Vintage Linen (빈티지 리넨 섬유)',
          '03. Pressed Crayon (압축 크레용 질감)',
          '04. Ink Diffusion (수묵 잉크 확산)'
        ],
      },
      {
        id: 5,
        pageNumber: 5,
        type: 'interview',
        title: 'DIALOGUE',
        subtitle: '아트&테크놀로지가 꿈꾸는 미래',
        content: [
          'Q. 인공지능과 아날로그는 대립하는가?',
          'A. 결코 아니다. 가장 현대적인 정밀함 위에서 비로소 아날로그의 따뜻함이 매력적인 예술로 피어난다.'
        ],
        quote: '"기술은 예술을 가능하게 하고, 예술은 기술을 완성한다."',
      },
      {
        id: 6,
        pageNumber: 6,
        type: 'back',
        title: 'PROMPT Vol. 01',
        subtitle: 'THANK YOU FOR READING',
        content: ['PUBLISHED BY GONGWON PRESS', 'SEOUL, KOREA'],
      }
    ]
  },
  {
    id: 2,
    vol: 2,
    title: 'REFRACTION & GLASS',
    subtitle: '영롱한 빛을 투과하는 3D 입체학',
    issueDate: '2026.04 - Vol. 02',
    themeColor: '#4A8096',
    accentColor: '#D2ECEE',
    coverBg: '#1B2830',
    description: 'WebGL 과 Three.js 셰이더를 활용한 미니멀 유리 재질과 물리 굴절 기법.',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        type: 'cover',
        title: 'PROMPT',
        subtitle: 'Vol. 02 | REFRACTION & GLASS',
        content: ['Physical Light Transmission in 3D WebGL'],
        imageAccent: '#4A8096',
      },
      {
        id: 2,
        pageNumber: 2,
        type: 'editorial',
        title: 'LIGHT TRANSMISSION',
        subtitle: '유리의 영롱함과 잉크 가독성의 양립',
        content: [
          'Transmission 0.99와 Roughness 0.03이 만나는 지점.',
          '빛을 머금은 맑은 유리판이 화면 위에서 춤출 때, 깊이 버퍼와 정반사 하이라이트가 만듭니다.'
        ],
        quote: '"투명하다는 것은 아무것도 없는 것이 아니라 모든 빛을 머금는 것이다."',
      },
      {
        id: 3,
        pageNumber: 3,
        type: 'feature',
        title: 'DOUBLE DECAL ARCHITECTURE',
        subtitle: '이중 데칼 샌드위치 구조',
        content: [
          '3D 유리의 고급스러운 굴절 렌더링을 보존하면서 잉크가 가려지지 않는 이중 데칼 구조 설계.'
        ],
        tags: ['Three.js', 'MeshPhysicalMaterial', 'Shader'],
      },
      {
        id: 4,
        pageNumber: 4,
        type: 'back',
        title: 'PROMPT Vol. 02',
        subtitle: 'THANK YOU FOR READING',
        content: ['PUBLISHED BY GONGWON PRESS'],
      }
    ]
  },
  {
    id: 3,
    vol: 3,
    title: 'THE RADIAL MIND',
    subtitle: '무한히 확장되는 생각의 방사형 마인드맵',
    issueDate: '2026.05 - Vol. 03',
    themeColor: '#7E57C2',
    accentColor: '#EDE7F6',
    coverBg: '#21182B',
    description: 'React Konva와 뷰포트 컬링으로 구현한 무한 탐색 대시보드 캔버스 구조.',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        type: 'cover',
        title: 'PROMPT',
        subtitle: 'Vol. 03 | THE RADIAL MIND',
        content: ['Infinite Canvas & Node Dynamics'],
        imageAccent: '#7E57C2',
      },
      {
        id: 2,
        pageNumber: 2,
        type: 'editorial',
        title: 'EXPANDING HORIZONS',
        subtitle: '중심에서 뻗어나가는 생각의 줄기들',
        content: [
          '5000px 가상 좌표계 위에 펼쳐진 방사형 노드 맵.',
          '우리의 생각은 직선으로 흐르지 않고, 방사형으로 퍼져나갑니다.'
        ],
      },
      {
        id: 3,
        pageNumber: 3,
        type: 'feature',
        title: 'PERFORMANCE AT 60FPS',
        subtitle: '뷰포트 컬링과 메모리 최적화',
        content: ['수백 개의 가상 노드 중 현재 화면에 들어오는 노드만을 동적으로 연산하여 부드러운 UX 보장.'],
        tags: ['React Konva', 'Viewport Culling', 'GSAP'],
      },
      {
        id: 4,
        pageNumber: 4,
        type: 'back',
        title: 'PROMPT Vol. 03',
        subtitle: 'THANK YOU FOR READING',
        content: ['PUBLISHED BY GONGWON PRESS'],
      }
    ]
  },
  {
    id: 4,
    vol: 4,
    title: 'SOUND & MOTION',
    subtitle: '감각을 일깨우는 아날로그 음향 합성',
    issueDate: '2026.06 - Vol. 04',
    themeColor: '#4CAF50',
    accentColor: '#E8F5E9',
    coverBg: '#1A291B',
    description: 'Web Audio API 코드로 실시간 합성하는 유리 파쇄음과 종이 마찰음 연구.',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        type: 'cover',
        title: 'PROMPT',
        subtitle: 'Vol. 04 | SOUND & MOTION',
        content: ['Real-time Audio Synthesis on Web'],
        imageAccent: '#4CAF50',
      },
      {
        id: 2,
        pageNumber: 2,
        type: 'editorial',
        title: 'SYNTHESIZING REALITY',
        subtitle: '외부 파일 없는 100% 코드 음향',
        content: [
          '네트워크 지연 없는 실시간 오디오 제어.',
          '오실레이터와 화이트 노이즈 믹싱이 만들어내는 생생한 상호작용 사운드.'
        ],
      },
      {
        id: 3,
        pageNumber: 3,
        type: 'back',
        title: 'PROMPT Vol. 04',
        subtitle: 'THANK YOU FOR READING',
        content: ['PUBLISHED BY GONGWON PRESS'],
      }
    ]
  },
  {
    id: 5,
    vol: 5,
    title: 'THE ART OF PROMPT',
    subtitle: '생성형 AI와 인간 창의성의 대화',
    issueDate: '2026.07 - Vol. 05',
    themeColor: '#D81B60',
    accentColor: '#FCE4EC',
    coverBg: '#2D141E',
    description: '언어가 만드는 새로운 시각적 언어와 인터랙션 프롬프트 엔지니어링 기록.',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        type: 'cover',
        title: 'PROMPT',
        subtitle: 'Vol. 05 | THE ART OF PROMPT',
        content: ['Generative Creativity & Prompting'],
        imageAccent: '#D81B60',
      },
      {
        id: 2,
        pageNumber: 2,
        type: 'editorial',
        title: 'HUMAN & MACHINE',
        subtitle: '질문이 곧 작품이 되는 시대',
        content: [
          '정교한 프롬프트는 에이전트와 창작자 사이의 가장 아름다운 가교입니다.',
          '우리는 질문함으로써 생성하고, 구듬으로써 완성합니다.'
        ],
      },
      {
        id: 3,
        pageNumber: 3,
        type: 'back',
        title: 'PROMPT Vol. 05',
        subtitle: 'THANK YOU FOR READING',
        content: ['PUBLISHED BY GONGWON PRESS'],
      }
    ]
  }
];

export const getMagazineById = (id: number): MagazineIssue | undefined => {
  return MAGAZINE_ISSUES.find(issue => issue.id === id);
};
