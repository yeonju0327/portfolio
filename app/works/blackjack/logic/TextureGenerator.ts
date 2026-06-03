import * as THREE from 'three';

// 문양별 심볼 정보
const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<string, string> = {
  spades: '#000000', // 쨍한 검은색 원색
  hearts: '#FF0000', // 쨍한 빨간색 원색
  diamonds: '#FF0000', // 쨍한 빨간색 원색
  clubs: '#000000', // 쨍한 검은색 원색
};

// 각 숫자별 문양 중심 좌표 반환 (1024x1536 기준)
const getSuitPositions = (value: string): [number, number][] => {
  const L = 340;
  const R = 684;
  const C = 512;
  
  const Y1 = 380;
  const Y2 = 574;
  const Y3 = 768;
  const Y4 = 962;
  const Y5 = 1156;

  switch (value) {
    case '2':
      return [[C, Y1], [C, Y5]];
    case '3':
      return [[C, Y1], [C, Y3], [C, Y5]];
    case '4':
      return [
        [L, Y1], [R, Y1],
        [L, Y5], [R, Y5]
      ];
    case '5':
      return [
        [L, Y1], [R, Y1],
        [C, Y3],
        [L, Y5], [R, Y5]
      ];
    case '6':
      return [
        [L, Y1], [R, Y1],
        [L, Y3], [R, Y3],
        [L, Y5], [R, Y5]
      ];
    case '7':
      return [
        [L, Y1], [R, Y1],
        [C, Y2],
        [L, Y3], [R, Y3],
        [L, Y5], [R, Y5]
      ];
    case '8':
      return [
        [L, Y1], [R, Y1],
        [C, Y2],
        [L, Y3], [R, Y3],
        [C, Y4],
        [L, Y5], [R, Y5]
      ];
    case '9':
      return [
        [L, Y1], [R, Y1],
        [L, Y2], [R, Y2],
        [C, Y3],
        [L, Y4], [R, Y4],
        [L, Y5], [R, Y5]
      ];
    case '10':
      return [
        [L, Y1], [R, Y1],
        [C, 509],
        [L, 638], [R, 638],
        [L, 898], [R, 898],
        [C, 1027],
        [L, Y5], [R, Y5]
      ];
    default:
      return [];
  }
};

// 각 숫자별 적절한 문양 크기 반환 (겹침 방지 및 최대 크기 확보)
const getSuitFontSize = (value: string): number => {
  switch (value) {
    case '2':
    case '3':
      return 260; // 개수가 적을 때는 260px로 크게 노출
    case '4':
    case '5':
      return 230;
    case '6':
    case '7':
    case '8':
      return 200;
    case '9':
    case '10':
      return 175; // 겹치지 않게 175px
    default:
      return 150;
  }
};

// 1. 카드 앞면(Face) 텍스처 생성 (1024x1536 고해상도)
export const createCardFaceTexture = (value: string, suit: string): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024 * 1.5; // 2:3 비율
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 전체 배경 투명화 후 옅은 흰색 불투명도 주입 (겹쳤을 때 자연스러운 레이어 연출용)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const symbol = SUIT_SYMBOLS[suit] || '?';
  const color = SUIT_COLORS[suit] || '#000';

  // 폰트 설정
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 좌측 상단 기호 및 숫자 (2x 좌표)
  ctx.fillText(value, 120, 160);
  ctx.font = '90px Arial, sans-serif';
  ctx.fillText(symbol, 120, 280);

  // 우측 하단 기호 및 숫자 (180도 회전, 2x 좌표)
  ctx.save();
  ctx.translate(canvas.width - 120, canvas.height - 160);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillText(value, 0, 0);
  ctx.font = '90px Arial, sans-serif';
  ctx.fillText(symbol, 0, 120);
  ctx.restore();

  const isFaceCard = ['A', 'J', 'Q', 'K'].includes(value);

  // Three.js 텍스처로 변환 및 고품질 필터 적용
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  if (isFaceCard) {
    if (value === 'A') {
      // A 카드: 로고 없이 문양만 크게 650px로 드로잉
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(1.05, 0.95);
      ctx.font = '650px Arial, sans-serif';
      ctx.fillText(symbol, 0, 0);
      ctx.restore();
    } else {
      // J, Q, K 카드: 문양 이미지 없음, 로고만 650px 크기로 중앙에 렌더링
      // 스페이드/클로버는 검은색, 하트/다이아몬드는 빨간색
      const logoColor = (suit === 'spades' || suit === 'clubs') ? '#000000' : '#FF0000';
      const img = new Image();
      img.src = '/images/gongwon_white.png';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const logoSize = 650;
        tempCanvas.width = logoSize;
        tempCanvas.height = logoSize;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, logoSize, logoSize);
          tempCtx.globalCompositeOperation = 'source-in';
          tempCtx.fillStyle = logoColor;
          tempCtx.fillRect(0, 0, logoSize, logoSize);

          ctx.save();
          ctx.drawImage(tempCanvas, canvas.width / 2 - logoSize / 2, canvas.height / 2 - logoSize / 2, logoSize, logoSize);
          ctx.restore();
          texture.needsUpdate = true;
        }
      };
    }
  } else {
    // 숫자 카드: 기호 개수를 숫자에 맞추어 그리드로 렌더링
    const positions = getSuitPositions(value);
    const fontSize = getSuitFontSize(value);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    positions.forEach(([x, y]) => {
      ctx.save();
      ctx.translate(x, y);
      if (y > 768) {
        ctx.rotate(Math.PI); // 하단 영역에 위치한 문양은 거꾸로 180도 회전
      }
      ctx.fillText(symbol, 0, 0);
      ctx.restore();
    });
  }

  return texture;
};

// 2. 카드 뒷면(Back) 텍스처 생성 (1024x1536 고해상도)
export const createCardBackTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024 * 1.5;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 전체 배경을 회색이 섞인 검은색 (#1A1A1A)으로 가득 채움
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  // GONGWON 흰색 로고 이미지(gongwon_white.png) 로드하여 중앙에 드로잉
  const img = new Image();
  img.src = '/images/gongwon_white.png';
  img.onload = () => {
    const logoW = 650;
    const logoH = 650;
    ctx.drawImage(img, cx - logoW / 2, cy - logoH / 2, logoW, logoH);
    texture.needsUpdate = true;
  };

  return texture;
};

// 3. 카드 뒷면 빛 투과 제어용 흑백 마스크(Transmission Map) 생성 (1024x1536)
export const createCardBackTransmissionMap = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024 * 1.5;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 기본적으로 전체 영역은 100% 투과 가능한 흰색(255, 255, 255)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 카드 디자인 영역 전체는 투과율 차단 검은색 (0% 투과율 ➔ 완전 선명하고 불투명하게)
  ctx.fillStyle = '#000000';
  ctx.fillRect(30, 30, canvas.width - 60, canvas.height - 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
};

// 4. 카드 앞면 빛 투과 제어용 흑백 마스크(Transmission Map) 생성 (1024x1536)
export const createCardFaceTransmissionMap = (value: string, suit: string): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024 * 1.5;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 전체 배경은 흰색 (100% 투과율 ➔ 맑은 유리 여백)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 테두리선 부분 차단 (검은색 ➔ 투과율 0%, 2x 크기)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 18;
  ctx.lineJoin = 'round';
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  const symbol = SUIT_SYMBOLS[suit] || '?';

  // 폰트 설정
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 좌측 상단 기호 및 숫자 (2x 좌표)
  ctx.fillText(value, 120, 160);
  ctx.font = '90px Arial, sans-serif';
  ctx.fillText(symbol, 120, 280);

  // 우측 하단 기호 및 숫자 (180도 회전, 2x 좌표)
  ctx.save();
  ctx.translate(canvas.width - 120, canvas.height - 160);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 110px Arial, sans-serif';
  ctx.fillText(value, 0, 0);
  ctx.font = '90px Arial, sans-serif';
  ctx.fillText(symbol, 0, 120);
  ctx.restore();

  const isFaceCard = ['A', 'J', 'Q', 'K'].includes(value);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  if (isFaceCard) {
    if (value === 'A') {
      // A 카드: 문양만 크게 650px로 드로잉
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(1.05, 0.95);
      ctx.font = '650px Arial, sans-serif';
      ctx.fillText(symbol, 0, 0);
      ctx.restore();
    } else {
      // J, Q, K 카드: 문양 이미지 없음, 로고만 650px 크기로 중앙에 검은색 실루엣 마스킹 처리
      const img = new Image();
      img.src = '/images/gongwon_white.png';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const logoSize = 650;
        tempCanvas.width = logoSize;
        tempCanvas.height = logoSize;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, logoSize, logoSize);
          tempCtx.globalCompositeOperation = 'source-in';
          tempCtx.fillStyle = '#000000'; // 마스크는 언제나 검은색
          tempCtx.fillRect(0, 0, logoSize, logoSize);

          ctx.save();
          ctx.drawImage(tempCanvas, canvas.width / 2 - logoSize / 2, canvas.height / 2 - logoSize / 2, logoSize, logoSize);
          ctx.restore();
          texture.needsUpdate = true;
        }
      };
    }
  } else {
    // 숫자 카드: 기호 개수를 숫자에 맞추어 그리드로 렌더링
    const positions = getSuitPositions(value);
    const fontSize = getSuitFontSize(value);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    positions.forEach(([x, y]) => {
      ctx.save();
      ctx.translate(x, y);
      if (y > 768) {
        ctx.rotate(Math.PI);
      }
      ctx.fillText(symbol, 0, 0);
      ctx.restore();
    });
  }

  return texture;
};
