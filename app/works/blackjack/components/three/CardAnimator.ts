import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { Card } from '../../hooks/useBlackjack';
import { soundManager } from '../../logic/SoundManager';
import { buildCardGroup, CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, opaqueBackMat } from './CardBuilder';

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

/**
 * 특정 카드를 유리가 깨지듯 산산조각내며 파편으로 비산시키는 3D 애니메이션을 재생합니다.
 * - 카드의 두께를 반영한 3D 입체 파편(ExtrudeGeometry)을 생성합니다.
 * - 파편이 사방으로 튕겨 나간 뒤, 테이블 바닥(Y=0.02)에 닿아 튕기고 그대로 안착하여 정지합니다.
 * @param cardGroup  깨뜨릴 카드 그룹
 * @param scene      Three.js Scene
 * @returns 애니메이션 완료 시점을 알리는 Promise
 */
export function shatterCard(cardGroup: THREE.Group, scene: THREE.Scene): Promise<void> {
  return new Promise<void>((resolve) => {
    // 1. 유리 파쇄음 재생
    soundManager.playShatter();

    // 2. 본래 카드 그룹은 즉각 보이지 않게 처리
    cardGroup.visible = false;

    // 3. 깨지는 파편들을 담을 월드 공간 그룹 생성 및 배치 (이름을 'shattersGroup'으로 설정)
    const shattersGroup = new THREE.Group();
    shattersGroup.name = 'shattersGroup';
    // 월드 중심에 두고 내부 조각들의 좌표를 월드 기준으로 직접 세팅
    shattersGroup.position.set(0, 0, 0);
    shattersGroup.rotation.set(0, 0, 0);
    scene.add(shattersGroup);

    // 원본 카드의 투명 유리 재질을 그대로 동적으로 승계
    const cardBodyMesh = cardGroup.children.find(child => child.name === 'cardBody') as THREE.Mesh;
    const targetGlassMat = cardBodyMesh && cardBodyMesh.material
      ? (cardBodyMesh.material as THREE.Material)
      : new THREE.MeshPhysicalMaterial({
          color: '#b2f2fc',
          metalness: 0.02,
          roughness: 0.06,
          transmission: 0.85,
          thickness: CARD_THICKNESS,
          ior: 1.52,
          transparent: false,
          depthWrite: false,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
        });

    // 카드 앞면 텍스처를 획득하여 상황에 맞춰 적용 (회전 오차 방지를 위해 로컬 Z 좌표로 판별)
    const faceDecalMesh = cardGroup.children.find(child => 
      child instanceof THREE.Mesh && 
      child.material && 
      (child.material as any).map && 
      child.position.z > 0.01
    ) as THREE.Mesh;
    const faceTex = faceDecalMesh ? (faceDecalMesh.material as any).map : null;

    // 앞면 데칼 공유 재질 준비 (MeshBasicMaterial로 왜곡 없는 인쇄면 구현)
    const decalMatFront = new THREE.MeshBasicMaterial({
      map: faceTex || undefined,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const W = CARD_WIDTH;
    const H = CARD_HEIGHT;
    const cols = 2;
    const rows = 2;
    const points: THREE.Vector3[][] = [];

    // 4. 무작위성을 가미한 격자 기반의 파편 중심점 생성 (아날로그 크랙 형태)
    for (let r = 0; r <= rows; r++) {
      points[r] = [];
      for (let c = 0; c <= cols; c++) {
        const bx = -W / 2 + (c / cols) * W;
        const by = -H / 2 + (r / rows) * H;
        
        let x = bx;
        let y = by;
        // 내부 점들에 무작위 지터(Jitter)를 적용하여 불규칙한 깨짐선 묘사
        if (r > 0 && r < rows && c > 0 && c < cols) {
          x += (Math.random() - 0.5) * (W / cols) * 0.65;
          y += (Math.random() - 0.5) * (H / rows) * 0.65;
        }
        points[r].push(new THREE.Vector3(x, y, 0));
      }
    }

    const duration = 1.2; // 파편 날아다니는 시간
    const geoms: THREE.BufferGeometry[] = [];

    // Extrude 설정 (모서리 베벨 조절)
    const extrudeSettings = {
      depth: CARD_THICKNESS,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    };

    // 카드의 월드 변환 행렬 및 회전값 획득
    cardGroup.updateMatrixWorld();
    const cardWorldMat = cardGroup.matrixWorld;
    const cardWorldQuat = cardGroup.getWorldQuaternion(new THREE.Quaternion());

    let finishedCount = 0;
    const totalShards = rows * cols * 2; // 2x2x2 = 8조각

    // 5. 입체 파편 생성 및 개별 궤도 설정
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p0 = points[r][c];
        const p1 = points[r][c+1];
        const p2 = points[r+1][c];
        const p3 = points[r+1][c+1];

        // 셀 영역당 2개의 대칭 삼각형 파편 구성
        const tris = [
          [p0, p1, p3],
          [p0, p3, p2]
        ];

        tris.forEach((tri) => {
          const [vA, vB, vC] = tri;
          // 파편의 기하학적 무게중심 산출
          const centroid = new THREE.Vector3()
            .add(vA).add(vB).add(vC)
            .divideScalar(3);

          // 중심축 기준으로 2D Shape 그리기
          const shape = new THREE.Shape();
          shape.moveTo(vA.x - centroid.x, vA.y - centroid.y);
          shape.lineTo(vB.x - centroid.x, vB.y - centroid.y);
          shape.lineTo(vC.x - centroid.x, vC.y - centroid.y);
          shape.closePath();

          // 3D 입체 ExtrudeGeometry 생성 (유리 몸체용)
          const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          geoms.push(geom);

          // 각 파편 조각도 하나의 작은 카드로 취급하기 위해 THREE.Group으로 생성
          const shardGroup = new THREE.Group();

          // A) 통유리판 몸체 메쉬 (원본 카드가 사용하는 하얗고 투명한 유리 재질을 그대로 바인딩)
          const bodyMesh = new THREE.Mesh(geom, targetGlassMat);
          bodyMesh.castShadow = false;
          bodyMesh.receiveShadow = false;
          shardGroup.add(bodyMesh);

          // B) 앞면 데칼 메쉬 (삼각형 형상의 ShapeGeometry에 앞면 텍스처 투사 매핑)
          const decalGeomFront = new THREE.ShapeGeometry(shape);
          const posAttrF = decalGeomFront.getAttribute('position');
          const uvAttrF = decalGeomFront.getAttribute('uv');
          if (posAttrF && uvAttrF) {
            for (let i = 0; i < posAttrF.count; i++) {
              const x = posAttrF.getX(i);
              const y = posAttrF.getY(i);
              const u = (x + centroid.x + W / 2) / W;
              const v = (y + centroid.y + H / 2) / H;
              uvAttrF.setXY(i, u, v);
            }
            uvAttrF.needsUpdate = true;
          }
          const faceDecal = new THREE.Mesh(decalGeomFront, decalMatFront);
          // ExtrudeGeometry의 앞 표면(Z = CARD_THICKNESS) 바로 위로 찰딱 오버레이하여 안착시킵니다.
          faceDecal.position.set(0, 0, CARD_THICKNESS + 0.0015);
          shardGroup.add(faceDecal);

          // 조각의 시작 위치를 월드 공간으로 변환 (Extrude Z두께 중심축 고려)
          const localCentroidWithDepth = new THREE.Vector3(centroid.x, centroid.y, -CARD_THICKNESS / 2);
          const worldCentroid = localCentroidWithDepth.clone().applyMatrix4(cardWorldMat);

          shardGroup.position.copy(worldCentroid);
          shardGroup.quaternion.copy(cardWorldQuat);
          shattersGroup.add(shardGroup);

          // 폭발 방향 궤적 설정 (카드 중심에서 조각 중심 방향으로 비산)
          const localDir = centroid.clone().normalize();
          // 월드 방향 벡터 변환
          const worldDir = localDir.clone().applyQuaternion(cardWorldQuat).normalize();

          // 최종 타겟 계산 (바닥 테이블 면에 떨어지도록 설정)
          const distFactor = 1.0 + Math.random() * 0.8;
          const targetX = worldCentroid.x + worldDir.x * distFactor;
          let targetZ = worldCentroid.z + worldDir.z * distFactor;

          // 다른 정상 카드가 배치되는 Z 영역과의 겹침을 방지하기 위한 위치 보정
          if (worldCentroid.z > 0) {
            // 플레이어 카드 영역 (Z = 1.0 ~ 2.2) 겹침 방지
            if (targetZ > 1.0 && targetZ < 2.2) {
              if (worldDir.z > 0) {
                targetZ = 2.3 + Math.random() * 0.5; // 카메라 앞으로 완전히 밀기
              } else {
                targetZ = 0.8 - Math.random() * 0.5; // 테이블 중앙으로 밀기
              }
            }
          } else {
            // 딜러 카드 영역 (Z = -2.2 ~ -1.0) 겹침 방지
            if (targetZ > -2.2 && targetZ < -1.0) {
              if (worldDir.z < 0) {
                targetZ = -2.3 - Math.random() * 0.5; // 딜러 뒤쪽으로 밀기
              } else {
                targetZ = -0.8 + Math.random() * 0.5; // 테이블 중앙으로 밀기
              }
            }
          }
          
          // 낙하 후 바닥 안착 높이 (테이블 상 Y = 0.02)
          const tableY = 0.02; 
          const peakY = worldCentroid.y + 0.6 + Math.random() * 0.5; // 점프 높이
          
          // 무작위로 눕는 회전각 (테이블에 납작하게 드러눕도록 X축 -Math.PI / 2 정렬에 임의 Y회전 가미)
          const targetAngleZ = Math.random() * Math.PI * 2;
          const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, targetAngleZ));

          // 물리 바운스 GSAP 연출 타임라인
          const shardTl = gsap.timeline({
            onComplete: () => {
              finishedCount++;
              if (finishedCount === totalShards) {
                // 모든 조각의 바닥 안착 애니메이션이 종료되면 약속 리졸브 (파편을 제거하지 않고 그대로 유지)
                resolve();
              }
            }
          });

          // X & Z 축 평면 비산
          shardTl.to(shardGroup.position, {
            x: targetX,
            z: targetZ,
            duration: duration,
            ease: 'power1.out'
          }, 0);

          // Y축 점프 후 낙하
          shardTl.to(shardGroup.position, {
            y: peakY,
            duration: duration * 0.3,
            ease: 'power1.out'
          }, 0)
          .to(shardGroup.position, {
            y: tableY,
            duration: duration * 0.5,
            ease: 'bounce.out', // 바운스 낙하
            onStart: () => {
              // 낙하와 동시에 회전해서 테이블 바닥에 납작하게 누우려는 연출 시작
              gsap.to(shardGroup.quaternion, {
                x: targetQuat.x,
                y: targetQuat.y,
                z: targetQuat.z,
                w: targetQuat.w,
                duration: duration * 0.5,
                ease: 'power1.out'
              });
            }
          }, duration * 0.3)
          // 바닥 1차 충돌 후 미세 튕김 (약 0.08 높이로 쿵 바운스)
          .to(shardGroup.position, {
            y: tableY + 0.08,
            duration: 0.15,
            ease: 'power1.out'
          }, duration * 0.8)
          .to(shardGroup.position, {
            y: tableY,
            duration: 0.15,
            ease: 'bounce.out'
          }, duration * 0.8 + 0.15);

          // 공중 3축 임의 스핀 (낙하 시작 시점까지 빠르게 회전)
          shardTl.to(shardGroup.rotation, {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: (Math.random() - 0.5) * 10,
            duration: duration * 0.8,
            ease: 'power1.out'
          }, 0);
        });
      }
    }
  });
}

/**
 * 씬에 남아있는 모든 깨진 카드 파편 그룹('shattersGroup')을 제거하고 리소스를 완전히 해제합니다.
 */
export function clearShatteredCards(scene: THREE.Scene): void {
  const targets = scene.children.filter((child) => child.name === 'shattersGroup');
  targets.forEach((group) => {
    scene.remove(group);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  });
}

