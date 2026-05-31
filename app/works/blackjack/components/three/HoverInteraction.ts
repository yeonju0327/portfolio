import * as THREE from 'three';

export interface HoverInteractionResult {
  /** 정규화된 디바이스 좌표 [-1, 1] — animate 루프 및 cleanup에서 참조 */
  pointerRef: { current: THREE.Vector2 };
  /** animate 루프 내에서 매 프레임 호출 — Raycasting 및 틸트 Lerp 처리 */
  tick: (camera: THREE.Camera) => void;
  /** 이벤트 리스너 정리 */
  dispose: () => void;
}

/**
 * 마우스 이동 이벤트를 감지하여 카드 그룹에 3D 틸트 호버 효과를 적용합니다.
 * animate 루프에서 tick()을 매 프레임 호출해야 합니다.
 */
export function createHoverInteraction(
  container: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  cardsMapRef: { current: Map<string, THREE.Group> },
  hoveredCardRef: { current: THREE.Group | null }
): HoverInteractionResult {
  const pointerRef = { current: new THREE.Vector2(-9999, -9999) };
  const raycaster = new THREE.Raycaster();

  const handleMouseMove = (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const handleMouseLeave = () => {
    pointerRef.current.set(-9999, -9999); // 화면 밖으로 이탈 처리
  };

  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseleave', handleMouseLeave);

  const restoreHoveredCard = () => {
    if (hoveredCardRef.current) {
      hoveredCardRef.current = null;
    }
  };

  const tick = (camera: THREE.Camera) => {
    if (pointerRef.current.x !== -9999) {
      raycaster.setFromCamera(pointerRef.current, camera);

      // cardsMapRef 내 카드 그룹들의 첫 번째 자식(메인 유리 메쉬)을 레이캐스트 타겟으로 수집
      const targetMeshes: THREE.Object3D[] = [];
      cardsMapRef.current.forEach((group) => {
        if (group.children[0]) targetMeshes.push(group.children[0]);
      });

      const intersects = raycaster.intersectObjects(targetMeshes);

      if (intersects.length > 0) {
        const cardGroup = intersects[0].object.parent as THREE.Group;
        if (hoveredCardRef.current !== cardGroup) {
          hoveredCardRef.current = cardGroup;
        }

        // 마우스 오프셋에 비례한 3D 틸팅 계산 (동적 흔들림 피드백)
        const intersectionPoint = intersects[0].point;
        const groupPos = cardGroup.position;
        const dx = intersectionPoint.x - groupPos.x;
        const dz = intersectionPoint.z - groupPos.z;

        // Y 높이 들썩임 — 탑 카드만 0.25, 아래 카드는 0.04로 제한
        const index = cardGroup.userData.index ?? 0;
        const handLength = cardGroup.userData.handLength ?? 1;
        const isTopCard = index === handLength - 1;
        const liftAmount = isTopCard ? 0.25 : 0.04;

        const baseTargetY = cardGroup.userData.originalY ?? groupPos.y;
        cardGroup.position.y = THREE.MathUtils.lerp(groupPos.y, baseTargetY + liftAmount, 0.15);

        // 기울기 틸트 — 원래의 엇갈린 Z축 회전을 반영하여 x축, z축 미세 변동
        const origRotX = cardGroup.userData.originalRotX ?? -Math.PI / 2;
        const origRotZ = cardGroup.userData.originalRotZ ?? 0;
        cardGroup.rotation.x = THREE.MathUtils.lerp(cardGroup.rotation.x, origRotX + dz * 0.15, 0.12);
        cardGroup.rotation.z = THREE.MathUtils.lerp(cardGroup.rotation.z, origRotZ + dx * -0.15, 0.12);
      } else {
        restoreHoveredCard();
      }
    } else {
      restoreHoveredCard();
    }

    // 호버되지 않은 카드들의 원래 Transform으로 부드러운 복귀 (Lerp 루프)
    cardsMapRef.current.forEach((group) => {
      if (group !== hoveredCardRef.current) {
        const origY = group.userData.originalY ?? group.position.y;
        const origRotX = group.userData.originalRotX ?? group.rotation.x;
        const origRotZ = group.userData.originalRotZ ?? 0;
        group.position.y = THREE.MathUtils.lerp(group.position.y, origY, 0.1);
        group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, origRotX, 0.1);
        group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, origRotZ, 0.1);
      }
    });
  };

  const dispose = () => {
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('mouseleave', handleMouseLeave);
  };

  return { pointerRef, tick, dispose };
}
