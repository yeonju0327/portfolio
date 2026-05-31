import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { Card } from '../../hooks/useBlackjack';
import { soundManager } from '../../logic/SoundManager';
import { buildCardGroup } from './CardBuilder';

/** 덱 더미 오브젝트와 동일한 위치 — 카드 딜링 시작 스폰 지점 */
export const DECK_SPAWN = { x: 3.5, y: 1.0, z: -3.2 } as const;

/**
 * 플레이어 또는 딜러 핸드를 씬에 반영합니다.
 * - 신규 카드: 덱 스폰 지점에서 목표 위치로 GSAP 딜링 애니메이션
 * - 기존 카드: 목표 정렬 공식으로 부드럽게 위치 보정
 * - 딜러 홀 카드: isHidden 전환 시 뒤집기 애니메이션
 *
 * @param hand       처리할 카드 배열
 * @param prefix     'P' = 플레이어, 'D' = 딜러
 * @param targetZ    카드 배치 Z 좌표 (플레이어: 1.6, 딜러: -1.6)
 * @param cardsMap   씬에 존재하는 카드 그룹 맵 (id → Group)
 * @param scene      Three.js Scene
 * @param cardGeo    공유 카드 지오메트리
 * @param sideGlassMat 공유 카드 유리 재질
 */
export function animateHand(
  hand: Card[],
  prefix: 'P' | 'D',
  targetZ: number,
  cardsMap: Map<string, THREE.Group>,
  scene: THREE.Scene,
  cardGeo: RoundedBoxGeometry,
  sideGlassMat: THREE.MeshPhysicalMaterial
): void {
  const totalCount = hand.length;
  const spacing = 0.52;
  const startX = -((totalCount - 1) * spacing) / 2;
  const isDealer = prefix === 'D';

  hand.forEach((card, index) => {
    const cardId = `${prefix}_${card.id}`;
    let cardGroup = cardsMap.get(cardId);

    // 목표 Transform 계산
    const targetX = startX + index * spacing;
    const targetY = 0.03 + index * 0.035; // 두께감이 느껴지도록 Y 단차를 확실하게 포갬
    // 첫 카드는 평평, 이후 카드는 왼쪽이 들리도록 Z축 음수 회전
    const targetRotZ = index === 0 ? 0 : -0.07;
    const targetRotX = isDealer
      ? (card.isHidden ? Math.PI / 2 : -Math.PI / 2) // 뒤집힘 유무에 따른 회전
      : -Math.PI / 2;

    if (!cardGroup) {
      // 신규 카드 딜링 — 덱 위치에서 스폰 후 목표 위치로 이동
      cardGroup = buildCardGroup(card, cardGeo, sideGlassMat);
      cardGroup.position.set(DECK_SPAWN.x, DECK_SPAWN.y, DECK_SPAWN.z);
      cardGroup.rotation.set(Math.PI / 2, 0, Math.PI / 6); // 덱 위에 엎어져 기울어진 각도

      scene.add(cardGroup);
      cardsMap.set(cardId, cardGroup);

      const dealDelay = (card.dealOrder ?? index) * 0.22;

      // 날아가기 전 슬라이딩 마찰음 트리거
      setTimeout(() => {
        soundManager.playSlide();
      }, dealDelay * 1000);

      gsap.to(cardGroup.position, {
        x: targetX, y: targetY, z: targetZ,
        duration: 0.7,
        delay: dealDelay,
        ease: 'back.out(1.1)', // 묵직하게 쿵 튕기는 바닥 탄성 표현
        onComplete: () => soundManager.playClink(), // 테이블 안착 시 유리 타격음
      });

      gsap.to(cardGroup.rotation, {
        x: targetRotX, y: 0, z: targetRotZ,
        duration: 0.7,
        delay: dealDelay,
        ease: 'power2.out',
      });
    } else {
      // 기존 카드 — 목표 정렬 공식으로 위치 및 Z 회전 보정 (리렌더 튐 방지)
      gsap.to(cardGroup.position, {
        x: targetX, y: targetY, z: targetZ,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(cardGroup.rotation, {
        z: targetRotZ,
        duration: 0.3,
        ease: 'power2.out',
      });

      // 딜러 홀 카드가 뒤집히는 경우 (isHidden: true → false)
      if (isDealer) {
        const currentRotX = cardGroup.rotation.x;
        if (Math.abs(currentRotX - targetRotX) > 0.1) {
          const depthCore = cardGroup.getObjectByName('depthCore');
          if (depthCore) depthCore.visible = !!card.isHidden;

          gsap.to(cardGroup.rotation, {
            x: targetRotX,
            duration: 0.6,
            ease: 'back.out(1.2)', // 묵직하게 넘어가 튕기는 피드백
            onComplete: () => soundManager.playClink(),
          });
        } else {
          cardGroup.rotation.x = targetRotX;
          const depthCore = cardGroup.getObjectByName('depthCore');
          if (depthCore) depthCore.visible = !!card.isHidden;
        }
      }
    }

    // userData 캐싱 (Raycaster 복구 시 참조)
    cardGroup.userData.originalX = targetX;
    cardGroup.userData.originalY = targetY;
    cardGroup.userData.originalRotX = targetRotX;
    cardGroup.userData.originalRotZ = targetRotZ;
    cardGroup.userData.index = index;
    cardGroup.userData.handLength = totalCount;
    if (isDealer) cardGroup.userData.isDealer = true;

    // depthCore 가시성 최종 동기화
    const depthCore = cardGroup.getObjectByName('depthCore');
    if (depthCore) depthCore.visible = !!card.isHidden;

    // Depth 렌더 오더 정렬
    cardGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.renderOrder = (card.dealOrder ?? index) + 10;
      }
    });
  });
}

/**
 * 더 이상 활성 핸드에 존재하지 않는 카드 그룹을 씬에서 제거하고 리소스를 해제합니다.
 */
export function removeStaleCards(
  activeIds: Set<string>,
  cardsMap: Map<string, THREE.Group>,
  scene: THREE.Scene
): void {
  cardsMap.forEach((group, id) => {
    if (!activeIds.has(id)) {
      scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      cardsMap.delete(id);
    }
  });
}
