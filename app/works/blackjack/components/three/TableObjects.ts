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
  // 1. 카드 구역 가이드 박스 라인 (외각 테두리만 흰색 실선)
  const guideGeo = new THREE.PlaneGeometry(6.5, 2.6);
  const edgesGeo = new THREE.EdgesGeometry(guideGeo);
  const borderMat = new THREE.LineBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.24,
  });

  const dealerGuide = new THREE.LineSegments(edgesGeo, borderMat);
  dealerGuide.rotation.x = -Math.PI / 2;
  dealerGuide.position.set(0, 0.01, -1.7);
  scene.add(dealerGuide);

  const playerGuide = new THREE.LineSegments(edgesGeo, borderMat);
  playerGuide.rotation.x = -Math.PI / 2;
  playerGuide.position.set(0, 0.01, 1.7);
  scene.add(playerGuide);

  // 2. 덱 쌓인 더미 (딜러와 플레이어 중간 우측인 Z=0, X=4.2 위치)
  const deckGroup = new THREE.Group();
  deckGroup.position.set(4.2, 0, 0);
  scene.add(deckGroup);

  // 덱 카드용 지오메트리 공유 생성
  const cardGeo = new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, 4, 0.05);

  // 아래 쌓여있는 카드들의 연한 아이보리/크림색 종이 질감 재질
  const paperMat = new THREE.MeshStandardMaterial({
    color: '#f2eee5',
    roughness: 0.9,
    metalness: 0.05,
  });

  const deckCount = 16; // 16장 레이어링으로 두께감 연출
  const geomsToDispose: THREE.BufferGeometry[] = [guideGeo, edgesGeo, cardGeo];
  const matsToDispose: THREE.Material[] = [borderMat, paperMat];

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
