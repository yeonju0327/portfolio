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

        const baseTargetY = cardGroup.userData.originalY ?? groupPos.y;
        // 위아래 들썩임 모션을 제거하여 물리적 관통 방지
        cardGroup.position.y = THREE.MathUtils.lerp(groupPos.y, baseTargetY, 0.15);

        // 기울어진 카드의 Y축 회전각을 반영하여 월드 오프셋을 로컬 오프셋(localDx, localDz)으로 역회전 변환
        const rotY = cardGroup.rotation.y;
        const cosY = Math.cos(-rotY);
        const sinY = Math.sin(-rotY);
        const localDx = dx * cosY - dz * sinY;
        const localDz = dx * sinY + dz * cosY;

        // X축 회전(끄덕임)은 원래 각도로 완전히 고정하여 관통 방지
        const origRotX = cardGroup.userData.originalRotX ?? -Math.PI / 2;
        cardGroup.rotation.x = THREE.MathUtils.lerp(cardGroup.rotation.x, origRotX, 0.12);

        // 네 모서리 터치 영역 판별에 따른 Z축 회전(평면 회전) 제어
        // 왼쪽 위 / 오른쪽 아래 모서리 호버 시 반시계(왼쪽) 회전 (rotation.z 양수)
        // 오른쪽 위 / 왼쪽 아래 모서리 호버 시 시계(오른쪽) 회전 (rotation.z 음수)
        const origRotZ = cardGroup.userData.originalRotZ ?? 0;
        
        // 특정 축 경계 교사 시 회전이 튀지 않고 자연스럽게 감속 후 반전되도록 곱(localDx * localDz) 기반의 연속 함수식 사용
        const clampX = THREE.MathUtils.clamp(localDx, -0.75, 0.75);
        const clampZ = THREE.MathUtils.clamp(localDz, -1.1, 1.1);
        
        // 흔들림 세기를 자연스럽고 부드럽게 0.13 계수로 설정
        const targetRotZOffset = clampX * clampZ * 0.13;

        cardGroup.rotation.z = THREE.MathUtils.lerp(cardGroup.rotation.z, origRotZ + targetRotZOffset, 0.12);
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
