import * as THREE from 'three';
import { gsap } from 'gsap';
import { soundManager } from '../../logic/SoundManager';
import { CARD_WIDTH } from './CardBuilder';

export interface Buttons3D {
  updateButtonsState: (stage: string, isAnimating: boolean) => void;
  tick: (camera: THREE.Camera, pointer: THREE.Vector2) => void;
  handlePointerDown: (camera: THREE.Camera, pointer: THREE.Vector2) => void;
  dispose: () => void;
}

/**
 * 필드 가이드라인처럼 은은하고 얇은 테두리를 가지는 평면 버튼용 텍스처를 생성합니다.
 */
function createButtonTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 아주 은은한 검은색 반투명 패드 배경
    ctx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24);
    ctx.fill();
    
    // 2. 가이드라인 테두리선과 일치하는 은은한 얇은 흰색 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24);
    ctx.stroke();
    
    // 3. 텍스트 그리기 (발광 없이 깔끔하게 흰색)
    ctx.font = 'bold 96px "Pretendard", -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  return texture;
}

/**
 * 테이블 표면에 완전히 밀착된 세로 정렬(Vertical) 형태의 평면 버튼을 구현합니다.
 */
export function createButtons3D(
  scene: THREE.Scene,
  onHit: () => void,
  onStand: () => void,
  onStart: () => void
): Buttons3D {
  const buttonsGroup = new THREE.Group();
  scene.add(buttonsGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const buttonsData = {
    hit: {
      defaultX: 4.2,
      defaultZ: 1.62, // 덱 아래 경계 1.075와 스탠드 위 경계 2.15 사이의 겉보기 원근 왜곡 보정 중앙 좌표
    },
    stand: {
      defaultX: 4.2,
      defaultZ: 2.575,
    }
  };

  // 가로 크기를 카드 가로와 동일한 CARD_WIDTH(1.45)로 맞추고, 세로 크기는 0.85로 확대
  const buttonHeight = 0.85;
  const planeGeo = new THREE.PlaneGeometry(CARD_WIDTH, buttonHeight);
  geometries.push(planeGeo);

  // 1. 힛(또는 START) 버튼 텍스처 & 재질 생성
  const hitTexActive = createButtonTexture('HIT');
  const hitTexStart = createButtonTexture('START');
  textures.push(hitTexActive, hitTexStart);

  const hitMat = new THREE.MeshBasicMaterial({
    map: hitTexStart,
    transparent: true,
    opacity: 0.12, // 초기엔 비활성
    side: THREE.DoubleSide,
    depthWrite: false
  });
  materials.push(hitMat);

  const hitMesh = new THREE.Mesh(planeGeo, hitMat);
  hitMesh.name = 'hit_body';
  hitMesh.renderOrder = 4;
  // 위치: X: 4.2, Z: 1.62 (덱 아래 경계 1.075와 스탠드 위 경계 2.15 사이 원근 왜곡을 보정한 겉보기 중앙 배치)
  hitMesh.position.set(buttonsData.hit.defaultX, 0.015, buttonsData.hit.defaultZ);
  hitMesh.rotation.x = -Math.PI / 2;
  buttonsGroup.add(hitMesh);

  // 2. 스탠드 버튼 텍스처 & 재질 생성
  const standTex = createButtonTexture('STAND');
  textures.push(standTex);

  const standMat = new THREE.MeshBasicMaterial({
    map: standTex,
    transparent: true,
    opacity: 0.12, // 초기엔 비활성
    side: THREE.DoubleSide,
    depthWrite: false
  });
  materials.push(standMat);

  const standMesh = new THREE.Mesh(planeGeo, standMat);
  standMesh.name = 'stand_body';
  standMesh.renderOrder = 4;
  // 위치: X: 4.2, Z: 2.575 (아랫날이 플레이어 가이드 하단선 Z: 3.0과 완벽하게 수평 정렬)
  standMesh.position.set(buttonsData.stand.defaultX, 0.015, buttonsData.stand.defaultZ);
  standMesh.rotation.x = -Math.PI / 2;
  buttonsGroup.add(standMesh);

  // 상호작용 가드 변수
  let hitActive = false;
  let standActive = false;
  let currentHitRole: 'HIT' | 'START' = 'START';

  const raycaster = new THREE.Raycaster();
  let hoveredButton: 'hit' | 'stand' | null = null;

  // ─────────────────────────────────────────────
  // 3. 상태 갱신 함수 (은은한 Opacity 조율)
  // ─────────────────────────────────────────────
  const updateButtonsState = (stage: string, isAnimating: boolean) => {
    if (isAnimating) {
      hitActive = false;
      standActive = false;
      gsap.to(hitMat, { opacity: 0.12, duration: 0.25 });
      gsap.to(standMat, { opacity: 0.12, duration: 0.25 });
      return;
    }

    if (stage === 'PLAYER_TURN') {
      hitActive = true;
      standActive = true;
      currentHitRole = 'HIT';
      hitMat.map = hitTexActive;
      hitMat.needsUpdate = true;

      gsap.to(hitMat, { opacity: 0.50, duration: 0.3 });
      gsap.to(standMat, { opacity: 0.50, duration: 0.3 });
    } else if (stage === 'READY' || stage === 'RESOLVED') {
      hitActive = true;
      standActive = false;
      currentHitRole = 'START';
      hitMat.map = hitTexStart;
      hitMat.needsUpdate = true;

      gsap.to(hitMat, { opacity: 0.50, duration: 0.3 });
      gsap.to(standMat, { opacity: 0.12, duration: 0.3 });
    } else {
      hitActive = false;
      standActive = false;
      gsap.to(hitMat, { opacity: 0.12, duration: 0.3 });
      gsap.to(standMat, { opacity: 0.12, duration: 0.3 });
    }
  };

  // ─────────────────────────────────────────────
  // 4. 프레임 틱 함수 (호버 감지 - 오직 불투명도 상승만 적용)
  // ─────────────────────────────────────────────
  const tick = (camera: THREE.Camera, pointer: THREE.Vector2) => {
    if (pointer.x === -9999) {
      clearHover();
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects([hitMesh, standMesh]);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      if (clickedMesh.name === 'hit_body' && hitActive) {
        if (hoveredButton !== 'hit') {
          hoveredButton = 'hit';
          soundManager.init();
          gsap.to(hitMat, { opacity: 0.85, duration: 0.2 });
          document.body.style.cursor = 'pointer';
        }
        if (standActive) {
          gsap.to(standMat, { opacity: 0.50, duration: 0.2 });
        }
      } else if (clickedMesh.name === 'stand_body' && standActive) {
        if (hoveredButton !== 'stand') {
          hoveredButton = 'stand';
          soundManager.init();
          gsap.to(standMat, { opacity: 0.85, duration: 0.2 });
          document.body.style.cursor = 'pointer';
        }
        if (hitActive) {
          gsap.to(hitMat, { opacity: 0.50, duration: 0.2 });
        }
      } else {
        clearHover();
      }
    } else {
      clearHover();
    }
  };

  const clearHover = () => {
    if (hoveredButton) {
      hoveredButton = null;
      document.body.style.cursor = 'default';
      if (hitActive) {
        gsap.to(hitMat, { opacity: 0.50, duration: 0.2 });
      }
      if (standActive) {
        gsap.to(standMat, { opacity: 0.50, duration: 0.2 });
      }
    }
  };

  // ─────────────────────────────────────────────
  // 5. 클릭 핸들러 (즉시 콜백 실행)
  // ─────────────────────────────────────────────
  const handlePointerDown = (camera: THREE.Camera, pointer: THREE.Vector2) => {
    if (pointer.x === -9999) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects([hitMesh, standMesh]);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      
      if (clickedMesh.name === 'hit_body' && hitActive) {
        soundManager.playClick();
        if (currentHitRole === 'HIT') {
          onHit();
        } else {
          onStart();
        }
      } else if (clickedMesh.name === 'stand_body' && standActive) {
        soundManager.playClick();
        onStand();
      }
    }
  };

  // ─────────────────────────────────────────────
  // 6. 리소스 해제
  // ─────────────────────────────────────────────
  const dispose = () => {
    scene.remove(buttonsGroup);
    document.body.style.cursor = 'default';
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    updateButtonsState,
    tick,
    handlePointerDown,
    dispose
  };
}
