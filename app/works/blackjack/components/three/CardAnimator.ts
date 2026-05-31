import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { Card } from '../../hooks/useBlackjack';
import { soundManager } from '../../logic/SoundManager';
import { buildCardGroup, CARD_WIDTH, CARD_THICKNESS } from './CardBuilder';

/** 덱 더미 오브젝트와 동일한 위치 — 카드 딜링 시작 스폰 지점 */
export const DECK_SPAWN = { x: 4.2, y: 1.0, z: 0.0 } as const;

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
  const isDealer = prefix === 'D';

  // 비균등 스페이싱 규격 정의 (1번째-2번째 간격은 넓게 0.82로 우측 이동, 이후 간격은 0.54)
  const s1 = 0.82; 
  const sRest = 0.54;

  // 전체 스택 가로폭 계산 후 중앙 정렬을 위한 시작 X 좌표(startX) 산출
  let totalWidth = 0;
  if (totalCount === 2) {
    totalWidth = s1;
  } else if (totalCount >= 3) {
    totalWidth = s1 + (totalCount - 2) * sRest;
  }
  const startX = -totalWidth / 2;

  hand.forEach((card, index) => {
    const cardId = `${prefix}_${card.id}`;
    let cardGroup = cardsMap.get(cardId);

    // 비균등 스페이싱을 누적 계산하여 인덱스별 정밀 X 좌표 적용
    let targetX = startX;
    if (index === 1) {
      targetX = startX + s1;
    } else if (index >= 2) {
      targetX = startX + s1 + (index - 1) * sRest;
    }

    // 목표 Transform 계산 (첫 장은 평평, 두 번째 장부터 쓰러진 도미노 효과)
    const isHiddenDealerCard = isDealer && card.isHidden;

    let targetRotY = 0;
    let targetRotZ = 0;
    let targetY = CARD_THICKNESS / 2; // 첫 번째 카드는 평평하게 눕혀져 바닥에 밀착

    if (index > 0) {
      // 두 번째 카드부터 플레이어 관점에서 화면 오른쪽(월드 +X축)이 바닥에 닿도록 자연스러운 틸트 적용
      // 물리적 비관통 조건(sin(theta) >= T/s)을 충족하는 임계 경사각 산정 (theta = 0.12 라디안, 약 6.8도)
      const theta = 0.12; 
      targetRotY = isHiddenDealerCard ? -theta : theta; // 좌우 방향 부호 보정
      targetRotZ = 0; // 접지 모서리가 테이블에 완전히 밀착되도록 회전축 정렬
      
      // 카드가 바닥(Y=0)에 오른쪽 모서리가 닿게 하는 정확한 Y 중심 위치 계산
      const baseHeight = (CARD_WIDTH / 2) * Math.sin(theta) - (CARD_THICKNESS / 2) * Math.cos(theta);
      // 카드 간 겹침 렌더링 품질을 개선하고 z-fighting을 방지하기 위한 미세 단차 누적
      targetY = baseHeight + (index - 1) * 0.005;
    }

    const targetRotX = isDealer
      ? (card.isHidden ? Math.PI / 2 : -Math.PI / 2)
      : -Math.PI / 2;

    if (!cardGroup) {
      // 신규 카드 딜링 — 덱 위치에서 스폰 후 목표 위치로 이동
      cardGroup = buildCardGroup(card, cardGeo, sideGlassMat);
      cardGroup.position.set(DECK_SPAWN.x, DECK_SPAWN.y, DECK_SPAWN.z);
      // 덱 위에 뒤집혀서 약간 기울어진 스폰 각도
      cardGroup.rotation.set(Math.PI / 2, 0, Math.PI / 6);

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
        x: targetRotX, y: targetRotY, z: targetRotZ,
        duration: 0.7,
        delay: dealDelay,
        ease: 'power2.out',
      });
    } else {
      // 기존 카드 — 목표 정렬 공식으로 위치 및 회전 보정 (리렌더 튐 방지)
      gsap.to(cardGroup.position, {
        x: targetX, y: targetY, z: targetZ,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(cardGroup.rotation, {
        y: targetRotY,
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
            y: targetRotY, // 뒤집히는 도중에도 도미노 Y축 회전 반영
            duration: 0.6,
            ease: 'back.out(1.2)', // 묵직하게 넘어가 튕기는 피드백
            onComplete: () => soundManager.playClink(),
          });
        } else {
          cardGroup.rotation.x = targetRotX;
          cardGroup.rotation.y = targetRotY;
          const depthCore = cardGroup.getObjectByName('depthCore');
          if (depthCore) depthCore.visible = !!card.isHidden;
        }
      }
    }

    // userData 캐싱 (Raycaster 복구 시 참조)
    cardGroup.userData.originalX = targetX;
    cardGroup.userData.originalY = targetY;
    cardGroup.userData.originalRotX = targetRotX;
    cardGroup.userData.originalRotY = targetRotY;
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
