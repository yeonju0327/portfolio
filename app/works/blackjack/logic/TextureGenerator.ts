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

  // 중앙 커다란 문양 드로잉 (2x 스케일) - 그림자 블러 제거로 경계선 극단 선명화
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(1.05, 0.95);
  ctx.font = '440px Arial, sans-serif';
  ctx.fillText(symbol, 0, 0);
  ctx.restore();

  // Three.js 텍스처로 변환 및 고품질 필터 적용
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
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

  // 중앙 커다란 문양 (2x 크기)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(1.05, 0.95);
  ctx.font = '440px Arial, sans-serif';
  ctx.fillText(symbol, 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
};
