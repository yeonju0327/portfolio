import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Card } from '../../hooks/useBlackjack';
import { createCardFaceTexture, createCardBackTexture } from '../../logic/TextureGenerator';

// 카드 치수 상수 — CardAnimator에서도 참조
export const CARD_WIDTH = 1.45;
export const CARD_HEIGHT = 2.15;
export const CARD_THICKNESS = 0.06;

/** 모든 카드가 공유하는 RoundedBoxGeometry를 생성합니다. */
export function createCardGeometry(): RoundedBoxGeometry {
  return new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, 4, 0.05);
}

/** 모든 카드가 공유하는 통유리판 MeshPhysicalMaterial을 생성합니다. */
export function createCardMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#b2f2fc', // 겹쳐졌을 때 색 뭉침을 막기 위해 더 밝고 화사한 청록빛 틴트
    metalness: 0.02,
    roughness: 0.06, // 미세 헤이즈 질감으로 뽀얀 연무 유리 표현
    transmission: 0.85, // 겹쳤을 때 아래 카드가 자연스럽게 뿌옇게 가려지도록 튜닝
    thickness: CARD_THICKNESS,
    ior: 1.52,
    transparent: false,
    depthWrite: false,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  });
}

/**
 * 카드 한 장에 해당하는 Three.js Group을 조립합니다.
 * - 통유리판 메쉬 (MeshPhysicalMaterial)
 * - 앞면 텍스처 데칼 (PlaneGeometry + MeshBasicMaterial)
 * - 뒷면 텍스처 데칼 (PlaneGeometry + MeshBasicMaterial, Y축 180도 회전)
 * - 샌드위치 Opaque Core (isHidden 상태일 때만 visible)
 */
export function buildCardGroup(
  card: Card,
  cardGeo: RoundedBoxGeometry,
  sideGlassMat: THREE.MeshPhysicalMaterial
): THREE.Group {
  const group = new THREE.Group();

  const faceTex = createCardFaceTexture(card.value, card.suit);
  if (faceTex) faceTex.anisotropy = 16;

  const backTex = createCardBackTexture();
  if (backTex) backTex.anisotropy = 16;

  // 1. 단일 통유리판 메쉬 (6면 전체 굴절 및 투과 유리)
  const cardMesh = new THREE.Mesh(cardGeo, sideGlassMat);
  cardMesh.castShadow = false;
  cardMesh.receiveShadow = false;
  group.add(cardMesh);

  // 2. 앞면 잉크 데칼 (입체 굴절의 왜곡을 받지 않도록 얇은 평면 오버레이)
  if (faceTex) {
    const decalGeo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    const faceDecalMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
      depthTest: true,
    });
    const faceDecal = new THREE.Mesh(decalGeo, faceDecalMat);
    faceDecal.position.set(0, 0, CARD_THICKNESS / 2 + 0.002); // 앞 표면에 찰딱 붙임
    group.add(faceDecal);
  }

  // 3. 뒷면 잉크 데칼 (Y축 180도 회전)
  if (backTex) {
    const decalGeo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    const backDecalMat = new THREE.MeshBasicMaterial({
      map: backTex,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
      depthTest: true,
    });
    const backDecal = new THREE.Mesh(decalGeo, backDecalMat);
    backDecal.position.set(0, 0, -(CARD_THICKNESS / 2 + 0.002)); // 뒷 표면에 찰딱 붙임
    backDecal.rotation.y = Math.PI;
    group.add(backDecal);
  }

  // 4. 샌드위치 Opaque Core (뒤집혀 숨겨진 동안만 활성화하여 유리 투과 차단)
  const coreGeo = new THREE.BoxGeometry(CARD_WIDTH - 0.04, CARD_HEIGHT - 0.04, 0.005);
  const coreMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 1.0,
    depthWrite: true,
  });
  const depthCore = new THREE.Mesh(coreGeo, coreMat);
  depthCore.name = 'depthCore';
  depthCore.position.set(0, 0, 0);
  depthCore.visible = !!card.isHidden;
  group.add(depthCore);

  return group;
}
