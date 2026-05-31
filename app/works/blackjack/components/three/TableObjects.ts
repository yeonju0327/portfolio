import * as THREE from 'three';

export interface TableObjectsResult {
  dispose: () => void;
}

/**
 * 카드 구역 가이드 박스(딜러/플레이어)와 덱 더미 오브젝트를 씬에 추가합니다.
 */
export function createTableObjects(scene: THREE.Scene): TableObjectsResult {
  // 카드 구역 가이드 박스 라인 (대각선 X자 없이 외각 테두리만 흰색 실선)
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

  // 우측 상단 덱 쌓인 더미 (초기 스폰 덱 시각 메타포)
  const deckDummyGeo = new THREE.BoxGeometry(1.55, 0.25, 2.25);
  const deckDummyMat = new THREE.MeshStandardMaterial({
    color: '#071609',
    roughness: 0.85,
    metalness: 0.15,
    transparent: true,
    opacity: 0.8,
  });
  const deckDummy = new THREE.Mesh(deckDummyGeo, deckDummyMat);
  deckDummy.position.set(3.5, 0.12, -3.2);
  scene.add(deckDummy);

  const dispose = () => {
    borderMat.dispose();
    guideGeo.dispose();
    edgesGeo.dispose();
    deckDummyGeo.dispose();
    deckDummyMat.dispose();
  };

  return { dispose };
}
