import * as THREE from 'three';

export interface Clocks3D {
  updateScores: (playerScore: number, dealerScore: number, stage: string) => void;
  dispose: () => void;
}

/**
 * 딜러(상대)용 점수 캔버스 텍스처를 생성합니다. (밝은 배경 위에 검은색 숫자)
 */
function createDealerClockCanvas(): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawDealerLED(ctx, canvas.width, canvas.height, '');
  }

  return { canvas, texture };
}

/**
 * 플레이어(내)용 점수 캔버스 텍스처를 생성합니다. (어두운 배경 위에 흰색 숫자)
 */
function createPlayerClockCanvas(): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawPlayerLED(ctx, canvas.width, canvas.height, '');
  }

  return { canvas, texture };
}

/**
 * 딜러 점수를 캔버스에 그립니다. (밝은 흰색 패널 위에 검은색 숫자, Pretendard 적용)
 */
function drawDealerLED(ctx: CanvasRenderingContext2D, w: number, h: number, scoreStr: string) {
  ctx.clearRect(0, 0, w, h); // 이전 캔버스 내용 완전 소거
  // 1. 밝은 반투명 유리 패널 배경
  ctx.fillStyle = 'rgba(235, 235, 235, 0.85)';
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 24);
  ctx.fill();

  // 얇은 테두리
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 24);
  ctx.stroke();

  // 2. 미세한 액정 그리드 모사
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
  for (let x = 15; x < w - 15; x += 8) {
    ctx.fillRect(x, 15, 1, h - 30);
  }
  for (let y = 15; y < h - 15; y += 8) {
    ctx.fillRect(15, y, w - 30, 1);
  }

  // 3. 점수가 없는 상태('--' 이거나 빈 문자열)일 때는 잔상 및 글씨 렌더링 완전 제외
  if (scoreStr === '' || scoreStr === '--') {
    return;
  }

  // 4. 꺼진 잔상 그리기 (Pretendard 적용)
  ctx.font = 'bold 150px "Pretendard", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
  ctx.shadowBlur = 0;
  ctx.fillText('88', w / 2, h / 2 + 8);

  // 5. 활성화된 스코어 텍스트 렌더링 (순수 검은색, Pretendard 적용)
  ctx.fillStyle = '#000000';
  
  let formattedScore = scoreStr;
  if (!isNaN(parseInt(scoreStr))) {
    const num = parseInt(scoreStr);
    if (num >= 0 && num < 10) {
      formattedScore = '0' + num;
    }
  }
  
  ctx.fillText(formattedScore, w / 2, h / 2 + 8);
}

/**
 * 플레이어 점수를 캔버스에 그립니다. (어두운 패널 위에 흰색 숫자, Pretendard 적용)
 */
function drawPlayerLED(ctx: CanvasRenderingContext2D, w: number, h: number, scoreStr: string) {
  ctx.clearRect(0, 0, w, h); // 이전 캔버스 내용 완전 소거
  // 1. 어두운 반투명 패드 배경
  ctx.fillStyle = 'rgba(15, 15, 15, 0.70)';
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 24);
  ctx.fill();

  // 은은한 패널 테두리
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 24);
  ctx.stroke();

  // 2. 미세한 그리드 모사
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let x = 15; x < w - 15; x += 8) {
    ctx.fillRect(x, 15, 1, h - 30);
  }
  for (let y = 15; y < h - 15; y += 8) {
    ctx.fillRect(15, y, w - 30, 1);
  }

  // 3. 점수가 없는 상태일 때는 잔상 및 글씨 렌더링 완전 제외
  if (scoreStr === '' || scoreStr === '--') {
    return;
  }

  // 4. 꺼진 잔상 그리기 (Pretendard 적용)
  ctx.font = 'bold 150px "Pretendard", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.shadowBlur = 0;
  ctx.fillText('88', w / 2, h / 2 + 8);

  // 5. 활성화된 스코어 텍스트 렌더링 (순수 흰색, Pretendard 적용)
  ctx.fillStyle = '#FFFFFF';
  
  let formattedScore = scoreStr;
  if (!isNaN(parseInt(scoreStr))) {
    const num = parseInt(scoreStr);
    if (num >= 0 && num < 10) {
      formattedScore = '0' + num;
    }
  }
  
  ctx.fillText(formattedScore, w / 2, h / 2 + 8);
}

/**
 * 테이블 표면에 완전히 밀착된 대형 평면 디스플레이 점수판을 좌측에 생성합니다. (내 점수: 흰색, 상대 점수: 검은색)
 */
export function createClocks3D(scene: THREE.Scene): Clocks3D {
  const clocksGroup = new THREE.Group();
  scene.add(clocksGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 가로 1.55, 세로 0.62 크기의 평면 Geometry (더욱 확대하여 시인성 확보)
  const displayGeo = new THREE.PlaneGeometry(1.55, 0.62);
  geometries.push(displayGeo);

  // 1. 딜러 스코어판 세팅 (MeshBasicMaterial 교체)
  const { canvas: dCanvas, texture: dTexture } = createDealerClockCanvas();
  textures.push(dTexture);

  const dealerMat = new THREE.MeshBasicMaterial({
    map: dTexture,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1.0
  });
  materials.push(dealerMat);

  const dDisplayMesh = new THREE.Mesh(displayGeo, dealerMat);
  dDisplayMesh.name = 'dealer_clock';
  dDisplayMesh.frustumCulled = false;
  dDisplayMesh.renderOrder = 3;
  // 위치: 딜러 가이드의 좌측 외각 바닥 밀착
  dDisplayMesh.position.set(-4.5, 0.02, -1.7);
  dDisplayMesh.rotation.x = -Math.PI / 2; // 완전히 눕힘
  clocksGroup.add(dDisplayMesh);

  // 2. 플레이어 스코어판 세팅
  const { canvas: pCanvas, texture: pTexture } = createPlayerClockCanvas();
  textures.push(pTexture);

  const playerMat = new THREE.MeshBasicMaterial({
    map: pTexture,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1.0
  });
  materials.push(playerMat);

  const pDisplayMesh = new THREE.Mesh(displayGeo, playerMat);
  pDisplayMesh.name = 'player_clock';
  pDisplayMesh.frustumCulled = false;
  pDisplayMesh.renderOrder = 3;
  // 위치: 플레이어 가이드의 좌측 외각 바닥 밀착
  pDisplayMesh.position.set(-4.5, 0.02, 1.7);
  pDisplayMesh.rotation.x = -Math.PI / 2; // 완전히 눕힘
  clocksGroup.add(pDisplayMesh);

  // ─────────────────────────────────────────────
  // 3. 점수 업데이트 핸들러
  // ─────────────────────────────────────────────
  const updateScores = (playerScore: number, dealerScore: number, stage: string) => {
    const dCtx = dCanvas.getContext('2d');
    const pCtx = pCanvas.getContext('2d');

    if (stage === 'READY') {
      if (dCtx) drawDealerLED(dCtx, dCanvas.width, dCanvas.height, '');
      if (pCtx) drawPlayerLED(pCtx, pCanvas.width, pCanvas.height, '');
    } else {
      if (dCtx) {
        const scoreStr = dealerScore >= 0 ? dealerScore.toString() : '';
        drawDealerLED(dCtx, dCanvas.width, dCanvas.height, scoreStr);
      }
      if (pCtx) {
        const scoreStr = playerScore >= 0 ? playerScore.toString() : '';
        drawPlayerLED(pCtx, pCanvas.width, pCanvas.height, scoreStr);
      }
    }

    // 텍스처 업로드 갱신
    dTexture.needsUpdate = true;
    pTexture.needsUpdate = true;
  };

  // ─────────────────────────────────────────────
  // 4. 리소스 해제
  // ─────────────────────────────────────────────
  const dispose = () => {
    scene.remove(clocksGroup);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    updateScores,
    dispose
  };
}
