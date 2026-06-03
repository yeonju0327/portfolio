'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Card } from '../hooks/useBlackjack';
import { createSceneSetup } from './three/SceneSetup';
import { createPostProcessing } from './three/PostProcessing';
import { loadEnvironment, disposeEnvironment, EnvironmentRefs } from './three/EnvironmentLoader';
import { createTableObjects } from './three/TableObjects';
import { createCardGeometry, createCardMaterial } from './three/CardBuilder';
import { animateHand, removeStaleCards, shatterCard, clearShatteredCards } from './three/CardAnimator';
import { createHoverInteraction } from './three/HoverInteraction';
import LoadingOverlay from './LoadingOverlay';
import { useTransitionContext } from '../../../context/TransitionContext';
import { calculateHandScore } from '../logic/BlackjackEngine';

import { createButtons3D } from './three/Buttons3D';
import { createClocks3D } from './three/Clocks3D';

interface BlackjackCanvasProps {
  playerHand: Card[];
  dealerHand: Card[];
  stage: string;
  rawStage: string;
  winner: 'player' | 'dealer' | 'push' | null;
  playerScore: number;
  dealerScore: number;
  isAnimating: boolean;
  onHit: () => void;
  onStand: () => void;
  onStart: () => void;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  onDealerBust?: () => void;
  onBack?: () => void;
}

export default function BlackjackCanvas({
  playerHand,
  dealerHand,
  stage,
  rawStage,
  winner,
  playerScore,
  dealerScore,
  isAnimating,
  onHit,
  onStand,
  onStart,
  onAnimationStart,
  onAnimationComplete,
  onDealerBust,
  onBack
}: BlackjackCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { releaseTransition } = useTransitionContext();

  // Three.js 핵심 ref (각 모듈의 dispose 함수 접근용)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<ReturnType<typeof createPostProcessing> | null>(null);
  const envRefsRef = useRef<EnvironmentRefs | null>(null);

  // 카드 & 호버 ref
  const cardsMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const hoveredCardRef = useRef<THREE.Group | null>(null);
  const cardGeoRef = useRef<ReturnType<typeof createCardGeometry> | null>(null);
  const sideGlassMatRef = useRef<ReturnType<typeof createCardMaterial> | null>(null);

  // 3D 버튼 & 시계 ref
  const buttonsRef = useRef<ReturnType<typeof createButtons3D> | null>(null);
  const clocksRef = useRef<ReturnType<typeof createClocks3D> | null>(null);

  // 로딩 오버레이 상태
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────
  // Effect 1: Three.js 씬 전체 초기화 (마운트 1회)
  // ─────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 씬, 카메라, 렌더러, 컨트롤, 광원
    const { scene, camera, renderer, controls, cyanLight, goldLight, dispose: disposeScene } =
      createSceneSetup(container);
    sceneRef.current = scene;
    cameraRef.current = camera;

    // 포스트 프로세싱 (Chroma + Glitch)
    const postProcessing = createPostProcessing(renderer, scene, camera, {
      width: container.clientWidth,
      height: container.clientHeight,
    });
    composerRef.current = postProcessing;

    // 테이블 오브젝트 (가이드 박스 + 덱 더미)
    const { dispose: disposeTable } = createTableObjects(scene);

    // 공유 카드 지오메트리 & 재질 (전체 게임 동안 재사용)
    const cardGeo = createCardGeometry();
    const cardMat = createCardMaterial();
    cardGeoRef.current = cardGeo;
    sideGlassMatRef.current = cardMat;

     // 3D 버튼 생성 및 바인딩
    const buttons3D = createButtons3D(
      scene,
      () => onHit(),
      () => onStand(),
      () => {
        clearShatteredCards(scene); // 시작 시 깨진 유리 조각 즉시 제거
        onStart();
      },
      () => {
        if (onBack) onBack();
      }
    );
    buttonsRef.current = buttons3D;

    // 3D LED 전자시계 점수판 생성
    const clocks3D = createClocks3D(scene);
    clocksRef.current = clocks3D;

    // 3D 버튼 클릭 마우스/터치 리스너 연결 (PointerUp 및 드래그 제어)
    let startX = 0;
    let startY = 0;
    let pressedButton: string | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      if (!cameraRef.current || !buttonsRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const pointer = new THREE.Vector2(x, y);

      startX = event.clientX;
      startY = event.clientY;
      pressedButton = buttonsRef.current.handlePointerDown(cameraRef.current, pointer);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!cameraRef.current || !buttonsRef.current || !pressedButton) return;

      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const pointer = new THREE.Vector2(x, y);

      // 드래그 거리 판별 (이동 거리가 8픽셀 이상이면 드래그 상태로 간주하여 취소)
      const dist = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (dist < 8) {
        buttonsRef.current.handlePointerUp(cameraRef.current, pointer, pressedButton);
      }

      pressedButton = null;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);

    // HDR 환경맵 비동기 로딩
    const envRefs = loadEnvironment({
      scene,
      renderer,
      overlayRef,
      onProgress: setLoadingProgress,
      onOverlayHidden: () => {
        setShowOverlay(false);
      },
      onLoad: () => {
        setTimeout(() => {
          releaseTransition();
        }, 500);
      }
    });
    envRefsRef.current = envRefs;

    // 마우스 호버 인터랙션
    const hover = createHoverInteraction(container, renderer, cardsMapRef, hoveredCardRef);

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      postProcessing.composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 애니메이션 루프
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // 광원 미세 춤
      const time = Date.now() * 0.0006;
      cyanLight.position.x = -6 + Math.sin(time * 1.1) * 1.8;
      cyanLight.position.z = 3 + Math.cos(time * 0.8) * 1.8;
      goldLight.position.x = 6 + Math.cos(time * 1.2) * 1.8;
      goldLight.position.z = -3 + Math.sin(time * 0.9) * 1.8;

      // Raycaster 호버 틸트 처리
      hover.tick(camera);

      // 3D 버튼 호버 tick 처리
      if (buttonsRef.current) {
        buttonsRef.current.tick(camera, hover.pointerRef.current);
      }

      postProcessing.composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
      hover.dispose();
      disposeTable();
      buttons3D.dispose();
      clocks3D.dispose();
      if (envRefsRef.current) disposeEnvironment(envRefsRef.current);
      postProcessing.dispose();
      cardGeoRef.current?.dispose();
      sideGlassMatRef.current?.dispose();
      disposeScene();
    };
  }, []);

  // ─────────────────────────────────────────────
  // Effect 2: 카드 핸드 동기화 (playerHand / dealerHand 변경 시)
  // ─────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    const cardGeo = cardGeoRef.current;
    const sideGlassMat = sideGlassMatRef.current;
    if (!scene || !cardGeo || !sideGlassMat) return;

    const cardsMap = cardsMapRef.current;

    // 더 이상 핸드에 없는 카드 제거
    const activeIds = new Set<string>();
    playerHand.forEach((c) => activeIds.add(`P_${c.id}`));
    dealerHand.forEach((c) => activeIds.add(`D_${c.id}`));
    removeStaleCards(activeIds, cardsMap, scene);

    // 라운드가 재시작되어 핸드가 완전히 비어있을 때 테이블 위의 모든 깨진 카드 파편 제거
    if (playerHand.length === 0 && dealerHand.length === 0) {
      clearShatteredCards(scene);
    }

    // 애니메이션 시작 콜백 트리거
    if (onAnimationStart) {
      onAnimationStart();
    }

    // 플레이어 핸드 (Z: +1.6)
    const playerPromises = animateHand(playerHand, 'P', 1.6, cardsMap, scene, cardGeo, sideGlassMat);
    // 딜러 핸드 (Z: -1.6)
    const dealerPromises = animateHand(dealerHand, 'D', -1.6, cardsMap, scene, cardGeo, sideGlassMat);

    Promise.all([...playerPromises, ...dealerPromises]).then(() => {
      // 딜링/뒤집기 애니메이션 완료 직후 버스트 여부 검사
      const pScore = calculateHandScore(playerHand);
      const dScore = calculateHandScore(dealerHand);

      // 플레이어 버스트 시 딜러 카드가 먼저 다 뒤집혀 오픈(rawStage === 'RESOLVED')된 이후에 비로소 카드를 깨뜨림
      if (pScore > 21 && playerHand.length > 0 && rawStage === 'RESOLVED') {
        const lastCard = playerHand[playerHand.length - 1];
        const cardId = `P_${lastCard.id}`;
        const group = cardsMap.get(cardId);
        if (group && !group.userData.hasShattered) {
          group.userData.hasShattered = true;
          shatterCard(group, scene).then(() => {
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          });
          return;
        }
      }

      if (dScore > 21 && dealerHand.length > 0) {
        const lastCard = dealerHand[dealerHand.length - 1];
        const cardId = `D_${lastCard.id}`;
        const group = cardsMap.get(cardId);
        if (group && !group.userData.hasShattered) {
          group.userData.hasShattered = true;

          // 1. 선 UI 반영: 딜러 버스트 정산 콜백을 즉시 호출
          if (onDealerBust) {
            onDealerBust();
          }

          // 2. 즉시 깨짐 애니메이션 진행 및 락 해제
          shatterCard(group, scene).then(() => {
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          });
          return;
        }
      }

      // 버스트 효과가 없는 일반적인 완료 처리
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, [playerHand, dealerHand, rawStage]);

  // ─────────────────────────────────────────────
  // Effect 3: 승패 비주얼 연출 (포스트 프로세싱 + 바닥 조명 효과)
  // ─────────────────────────────────────────────
  useEffect(() => {
    const pp = composerRef.current;
    const scene = sceneRef.current;
    if (!pp) return;
    const { chromaPass } = pp;

    // 1. 색수차 포스트 프로세싱 제어 (승리 피드백 프리즘 왜곡 - 게임이 정산된 stage === 'RESOLVED' 상황에서만 발동하도록 가드 강제)
    if (winner === 'player' && stage === 'RESOLVED') {
      // 플레이어 승리: 레인보우 색수차 프리즘 효과
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0;
      gsap.timeline()
        .to(chromaPass.uniforms.uAmount, { value: 0.035, duration: 0.3, ease: 'power2.out' })
        .to(chromaPass.uniforms.uAmount, { value: 0.0, duration: 1.5, ease: 'power1.inOut' });
    } else {
      // 무승부, 패배(버스트 포함) 또는 게임 진행 중: 모든 효과 초기화 (일반 상황 튐 버그 방지)
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0.0;
    }

    // 2. 바닥 필드 조명 효과 제어 (승자 피드백 바닥 발광 - 연두색 시인성 극대화를 위해 opacity 0.22 상향)
    if (scene) {
      const pFloor = scene.getObjectByName('player_floor') as THREE.Mesh;
      const dFloor = scene.getObjectByName('dealer_floor') as THREE.Mesh;

      if (pFloor && dFloor) {
        const pFloorMat = pFloor.material as THREE.MeshBasicMaterial;
        const dFloorMat = dFloor.material as THREE.MeshBasicMaterial;

        gsap.killTweensOf([pFloorMat, dFloorMat, pFloorMat.color, dFloorMat.color]);

        if (stage === 'RESOLVED') {
          // 플레이어가 처음 2장으로 21점(내추럴 블랙잭)을 얻어 승리/무승부했을 때는 쨍한 노란빛(#ffff00), 그 외에는 기본 연두색(#82ff93)
          const isBlackjack = playerScore === 21 && playerHand.length === 2;
          const targetColorHex = isBlackjack ? '#ffff00' : '#82ff93';
          const targetColor = new THREE.Color(targetColorHex);
          const defaultColor = new THREE.Color('#82ff93');

          if (winner === 'player') {
            // 플레이어 구역: 골드 또는 연두색 트랜지션
            gsap.to(pFloorMat.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: 0.6, ease: 'power2.out' });
            gsap.to(pFloorMat, { opacity: 0.22, duration: 0.8, ease: 'power2.out' });
            
            // 딜러 구역: 조명 끔
            gsap.to(dFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
            gsap.to(dFloorMat, { opacity: 0.0, duration: 0.4, ease: 'power2.out' });
          } else if (winner === 'dealer') {
            // 딜러 구역: 연두색 불 켜짐
            gsap.to(dFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.6, ease: 'power2.out' });
            gsap.to(dFloorMat, { opacity: 0.22, duration: 0.8, ease: 'power2.out' });
            
            // 플레이어 구역: 조명 끔
            gsap.to(pFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
            gsap.to(pFloorMat, { opacity: 0.0, duration: 0.4, ease: 'power2.out' });
          } else if (winner === 'push') {
            // 양쪽 모두 켜짐 (블랙잭 무승부면 황금빛, 아니면 연두색)
            gsap.to(pFloorMat.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: 0.6, ease: 'power2.out' });
            gsap.to(dFloorMat.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: 0.6, ease: 'power2.out' });
            gsap.to([pFloorMat, dFloorMat], { opacity: 0.22, duration: 0.8, ease: 'power2.out' });
          } else {
            // 그 외 정산 결과: 조명 끔
            gsap.to(pFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
            gsap.to(dFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
            gsap.to([pFloorMat, dFloorMat], { opacity: 0.0, duration: 0.4, ease: 'power2.out' });
          }
        } else {
          // 게임 진행 및 대기 중에는 바닥 조명을 완전히 끄고 기본 색상(연두색)으로 원복
          const defaultColor = new THREE.Color('#82ff93');
          gsap.to(pFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
          gsap.to(dFloorMat.color, { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b, duration: 0.4, ease: 'power2.out' });
          gsap.to([pFloorMat, dFloorMat], { opacity: 0.0, duration: 0.4, ease: 'power2.out' });
        }
      }
    }
  }, [winner, stage, playerScore]);

  // ─────────────────────────────────────────────
  // Effect 4: 3D 버튼 상태 갱신
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (buttonsRef.current) {
      buttonsRef.current.updateButtonsState(stage, isAnimating);
    }
  }, [stage, isAnimating]);

  // ─────────────────────────────────────────────
  // Effect 5: 3D 전자시계 점수 갱신
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (clocksRef.current) {
      clocksRef.current.updateScores(playerScore, dealerScore, stage);
    }
  }, [playerScore, dealerScore, stage]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {showOverlay && (
        <LoadingOverlay
          loadingProgress={loadingProgress}
          overlayRef={overlayRef}
        />
      )}
    </div>
  );
}
