import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { Card } from '../../hooks/useBlackjack';
import { soundManager } from '../../logic/SoundManager';
import { buildCardGroup, CARD_WIDTH, CARD_THICKNESS, opaqueBackMat } from './CardBuilder';

/** 덱 더미 오브젝트와 동일한 위치 — 카드 딜링 시작 스폰 지점 */
// 덱에 쌓인 16장의 윗면 표면 Y = 0.858 + 0.03 = 0.888. 그 위에 얹히는 카드의 중심 Y = 0.888 + 0.03 = 0.918 (약 0.92)
export const DECK_SPAWN = { x: 4.2, y: 0.92, z: 0.0 } as const;

/**
 * 플레이어 또는 딜러 핸드를 씬에 반영합니다.
 * - 신규 카드: 덱 스폰 지점에서 목표 위치로 GSAP 딜링 애니메이션 후 뒤집기
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
 * @returns 각 카드의 애니메이션 완료 타이밍을 알 수 있는 Promise 배열
 */
export function animateHand(
  hand: Card[],
  prefix: 'P' | 'D',
  targetZ: number,
  cardsMap: Map<string, THREE.Group>,
  scene: THREE.Scene,
  cardGeo: RoundedBoxGeometry,
  sideGlassMat: THREE.MeshPhysicalMaterial
): Promise<void>[] {
  const promises: Promise<void>[] = [];
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

  // 이번 딜링에서 새로 날아가는 카드들의 동적 딜레이를 위한 인덱스 카운터
  let newCardIndex = 0;

  // 이번 턴에 딜러 홀 카드(isHidden: true -> false)가 오픈되는지 여부 판별
  let isDealerRevealThisTurn = false;
  if (isDealer) {
    const revealedHoleCard = hand.find(c => !c.isHidden);
    if (revealedHoleCard) {
      const cardId = `${prefix}_${revealedHoleCard.id}`;
      const group = cardsMap.get(cardId);
      if (group) {
        // 이미 씬에 존재하는데, rotation.x가 뒤집혀있던 상태(Math.PI / 2 근처)라면 이번에 뒤집히는 것
        if (Math.abs(group.rotation.x - (-Math.PI / 2)) > 0.1) {
          isDealerRevealThisTurn = true;
        }
      }
    }
  }

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
      // 덱 위에 뒷면이 하늘을 보도록 완전히 평평한 상태로 초기화 (Math.PI / 2)
      cardGroup.rotation.set(Math.PI / 2, 0, 0);

      // 애니메이션 가드 활성화
      cardGroup.userData.isAnimating = true;

      // [핵심] 비행 중에는 유리의 투과성 때문에 앞면이 보이지 않도록 불투명 재질과 코어를 강제 활성화!
      const cardBody = cardGroup.getObjectByName('cardBody') as THREE.Mesh;
      if (cardBody) cardBody.material = opaqueBackMat;
      const depthCore = cardGroup.getObjectByName('depthCore');
      if (depthCore) depthCore.visible = true;

      scene.add(cardGroup);
      cardsMap.set(cardId, cardGroup);

      // 동적 딜레이 계산
      let dealDelay = 0;
      if (card.dealOrder !== undefined && card.dealOrder >= 0 && card.dealOrder < 4) {
        // 초기 4장 분배 단계 (0.28초 간격으로 순차 분배)
        dealDelay = card.dealOrder * 0.28;
      } else {
        // 추가 카드 분배 (Hit 또는 Stand 시의 딜러 추가 드로우)
        if (isDealerRevealThisTurn) {
          // 딜러 턴 전환으로 홀 카드가 먼저 뒤집히는 시간을 감안하여 딜레이 부여
          dealDelay = 0.5 + newCardIndex * 0.38;
        } else {
          // 플레이어의 Hit인 경우 딜레이 없이 즉시 날아가게 함
          dealDelay = newCardIndex * 0.38;
        }
      }
      newCardIndex++;

      // 날아가기 전 슬라이딩 마찰음 트리거
      setTimeout(() => {
        soundManager.playSlide();
      }, dealDelay * 1000);

      const p = new Promise<void>((resolve) => {
        const targetGroup = cardGroup; // 클로저 스코프 안전성 확보
        // 1. position 이동 (정확하게 흔들림 없이 power2.out)
        gsap.to(targetGroup!.position, {
          x: targetX, y: targetY, z: targetZ,
          duration: 0.5,
          delay: dealDelay,
          ease: 'power2.out',
          onComplete: () => {
            // 테이블 안착음
            soundManager.playClink();

            // 2. 이동이 완료된 후에 뒤집기 (절대 덱 위에서 뒤집거나 이동 중에 뒤집지 않음)
            if (!card.isHidden) {
              gsap.to(targetGroup!.rotation, {
                x: targetRotX,
                y: targetRotY,
                z: targetRotZ,
                duration: 0.45,
                ease: 'power2.out',
                onStart: () => {
                  // 뒤집기 시작할 때 비로소 투명 유리판 재질로 스위칭하고 불투명 코어를 비활성화!
                  const body = targetGroup!.getObjectByName('cardBody') as THREE.Mesh;
                  if (body) body.material = sideGlassMat;
                  const core = targetGroup!.getObjectByName('depthCore');
                  if (core) core.visible = false;
                },
                onComplete: () => {
                  // 뒤집기 완료 시 소리 한 번 더 재생
                  soundManager.playClink();
                  targetGroup!.userData.isAnimating = false; // 가드 해제
                  resolve();
                }
              });
            } else {
              // 딜러의 히든 카드는 뒤집지 않고, 틸트 효과만 부드럽게 먹임 (불투명 상태 유지)
              gsap.to(targetGroup!.rotation, {
                y: targetRotY,
                z: targetRotZ,
                duration: 0.3,
                ease: 'power2.out',
                onComplete: () => {
                  targetGroup!.userData.isAnimating = false; // 가드 해제
                  resolve();
                }
              });
            }
          }
        });
      });
      promises.push(p);

    } else {
      // 만약 카드가 아직 비행/뒤집기 중이라면 덮어쓰기 보정 로직을 전면 스킵한다!
      if (cardGroup.userData.isAnimating) {
        return;
      }

      const existingGroup = cardGroup;
      gsap.to(existingGroup.position, {
        x: targetX, y: targetY, z: targetZ,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(existingGroup.rotation, {
        y: targetRotY,
        z: targetRotZ,
        duration: 0.3,
        ease: 'power2.out',
      });

      // 딜러 홀 카드가 뒤집히는 경우 (isHidden: true → false)
      if (isDealer) {
        const currentRotX = existingGroup.rotation.x;
        if (Math.abs(currentRotX - targetRotX) > 0.1) {
          const p = new Promise<void>((resolve) => {
            // 뒤집기 가드 활성화
            existingGroup.userData.isAnimating = true;

            gsap.to(existingGroup.rotation, {
              x: targetRotX,
              y: targetRotY, // 뒤집히는 도중에도 도미노 Y축 회전 반영
              duration: 0.5,
              ease: 'power2.out', // 흔들림 제거
              onStart: () => {
                // 뒤집기 개시 시점에 투명 유리 재질로 복구하고 깊이 코어도 꺼줌
                const body = existingGroup.getObjectByName('cardBody') as THREE.Mesh;
                if (body) body.material = sideGlassMat;
                const core = existingGroup.getObjectByName('depthCore');
                if (core) core.visible = false;
              },
              onComplete: () => {
                soundManager.playClink();
                existingGroup.userData.isAnimating = false; // 가드 해제
                resolve();
              },
            });
          });
          promises.push(p);
        } else {
          existingGroup.rotation.x = targetRotX;
          existingGroup.rotation.y = targetRotY;
          
          // 이미 안착된 정적인 기존 카드의 최종 물리 재질 복구
          const body = existingGroup.getObjectByName('cardBody') as THREE.Mesh;
          if (body) body.material = card.isHidden ? opaqueBackMat : sideGlassMat;
          const core = existingGroup.getObjectByName('depthCore');
          if (core) core.visible = !!card.isHidden;
        }
      }
    }

    // userData 캐싱
    cardGroup.userData.originalX = targetX;
    cardGroup.userData.originalY = targetY;
    cardGroup.userData.originalRotX = targetRotX;
    cardGroup.userData.originalRotY = targetRotY;
    cardGroup.userData.originalRotZ = targetRotZ;
    cardGroup.userData.index = index;
    cardGroup.userData.handLength = totalCount;
    if (isDealer) cardGroup.userData.isDealer = true;

    // Depth 렌더 오더 정렬
    cardGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.renderOrder = (card.dealOrder ?? index) + 10;
      }
    });
  });

  return promises;
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
