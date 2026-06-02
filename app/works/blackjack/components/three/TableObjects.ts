import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS } from './CardBuilder';
import { createCardBackTexture } from '../../logic/TextureGenerator';

export interface TableObjectsResult {
  dispose: () => void;
}

/**
 * 카드 구역 가이드 박스(딜러/플레이어)와 덱 더미 오브젝트를 씬에 추가합니다.
 */
export function createTableObjects(scene: THREE.Scene): TableObjectsResult {
  const geomsToDispose: THREE.BufferGeometry[] = [];
  const matsToDispose: THREE.Material[] = [];

  // 1. 카드 구역 가이드 박스 라인 (외각 테두리 단일 ShapeGeometry 면 구조)
  const borderThickness = 0.015; // 선 두께를 얇고 선명하게 조절 (기존 0.045에서 축소)
  const guideWidth = 6.5;
  const guideHeight = 2.6;

  const shape = new THREE.Shape();
  const hw = guideWidth / 2;
  const hh = guideHeight / 2;

  // 외각 사각형 정의 (시계 반대 방향)
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  // 내각 구멍 정의 (시계 방향으로 차감)
  const hole = new THREE.Path();
  const ihw = hw - borderThickness;
  const ihh = hh - borderThickness;
  hole.moveTo(-ihw, -ihh);
  hole.lineTo(-ihw, ihh);
  hole.lineTo(ihw, ihh);
  hole.lineTo(ihw, -ihh);
  hole.closePath();
  shape.holes.push(hole);

  const guideGeo = new THREE.ShapeGeometry(shape);
  geomsToDispose.push(guideGeo);

  const borderMat = new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.40, // 얇아진 선에 맞추어 투명도 재조정 (0.55 -> 0.40)
    side: THREE.DoubleSide,
  });
  matsToDispose.push(borderMat);

  // 1-2. 승패 시 불이 켜질 바닥 판 메쉬 생성 (가이드 박스 내부 전체 영역)
  const floorGeo = new THREE.PlaneGeometry(6.5, 2.6);
  geomsToDispose.push(floorGeo);

  const dFloorMat = new THREE.MeshBasicMaterial({
    color: '#82ff93',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  matsToDispose.push(dFloorMat);

  const dealerFloor = new THREE.Mesh(floorGeo, dFloorMat);
  dealerFloor.name = 'dealer_floor';
  dealerFloor.renderOrder = 1;
  dealerFloor.rotation.x = -Math.PI / 2;
  dealerFloor.position.set(0, 0.005, -1.7);
  scene.add(dealerFloor);

  const pFloorMat = new THREE.MeshBasicMaterial({
    color: '#82ff93',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  matsToDispose.push(pFloorMat);

  const playerFloor = new THREE.Mesh(floorGeo, pFloorMat);
  playerFloor.name = 'player_floor';
  playerFloor.renderOrder = 1;
  playerFloor.rotation.x = -Math.PI / 2;
  playerFloor.position.set(0, 0.005, 1.7);
  scene.add(playerFloor);

  const dealerGuide = new THREE.Mesh(guideGeo, borderMat);
  dealerGuide.renderOrder = 2;
  dealerGuide.rotation.x = -Math.PI / 2;
  dealerGuide.position.set(0, 0.01, -1.7);
  scene.add(dealerGuide);

  const playerGuide = new THREE.Mesh(guideGeo, borderMat);
  playerGuide.renderOrder = 2;
  playerGuide.rotation.x = -Math.PI / 2;
  playerGuide.position.set(0, 0.01, 1.7);
  scene.add(playerGuide);

  // 2. 덱 쌓인 더미 (딜러와 플레이어 중간 우측인 Z=0, X=4.2 위치)
  const deckGroup = new THREE.Group();
  deckGroup.position.set(4.2, 0, 0);
  scene.add(deckGroup);

  // 덱 카드용 지오메트리 공유 생성
  const cardGeo = new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, 4, 0.05);
  geomsToDispose.push(cardGeo);

  // 아래 쌓여있는 카드들의 연한 검정/차콜 종이 질감 재질
  const paperMat = new THREE.MeshStandardMaterial({
    color: '#1A1A1A',
    roughness: 0.9,
    metalness: 0.05,
  });
  matsToDispose.push(paperMat);

  const deckCount = 16; // 16장 레이어링으로 두께감 연출

  // 덱 맨 윗장 뒷면 데칼 텍스처 및 재질
  const backTex = createCardBackTexture();
  let backDecalMat: THREE.MeshBasicMaterial | null = null;
  if (backTex) {
    backTex.anisotropy = 16;
    backDecalMat = new THREE.MeshBasicMaterial({
      map: backTex,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
      depthTest: true,
    });
    matsToDispose.push(backDecalMat);
  }

  // 16장의 카드를 미세하게 어긋나게 쌓아 아날로그적 불규칙성 표현
  for (let i = 0; i < deckCount; i++) {
    const cardMesh = new THREE.Mesh(cardGeo, paperMat);
    cardMesh.rotation.x = -Math.PI / 2;

    // 자연스럽게 손으로 모은 덱 느낌을 위한 미세 무작위 오프셋
    const randX = (Math.random() - 0.5) * 0.015;
    const randZ = (Math.random() - 0.5) * 0.015;
    const randRotZ = (Math.random() - 0.5) * 0.03;

    // 카드가 겹치며 쌓이는 높이 Y 좌표 설정 (미세 오프셋 누적)
    const cardY = CARD_THICKNESS / 2 + i * (CARD_THICKNESS * 0.92);
    cardMesh.position.set(randX, cardY, randZ);
    cardMesh.rotation.z = randRotZ;
    deckGroup.add(cardMesh);

    // 맨 윗장 카드에는 뒷면 텍스처 데칼 부착
    if (i === deckCount - 1 && backDecalMat) {
      const decalGeo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      geomsToDispose.push(decalGeo);

      const decalMesh = new THREE.Mesh(decalGeo, backDecalMat);
      decalMesh.position.set(0, 0, CARD_THICKNESS / 2 + 0.001); // 윗 표면에 부착
      cardMesh.add(decalMesh);
    }
  }

  const dispose = () => {
    scene.remove(deckGroup);
    
    geomsToDispose.forEach((g) => g.dispose());
    matsToDispose.forEach((m) => m.dispose());
    if (backTex) backTex.dispose();
  };

  return { dispose };
}
