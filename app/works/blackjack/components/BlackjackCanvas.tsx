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
import { animateHand, removeStaleCards } from './three/CardAnimator';
import { createHoverInteraction } from './three/HoverInteraction';
import LoadingOverlay from './LoadingOverlay';

interface BlackjackCanvasProps {
  playerHand: Card[];
  dealerHand: Card[];
  stage: string;
  winner: 'player' | 'dealer' | 'push' | null;
}

export default function BlackjackCanvas({ playerHand, dealerHand, stage, winner }: BlackjackCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

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

    // HDR 환경맵 비동기 로딩
    const envRefs = loadEnvironment({
      scene,
      renderer,
      overlayRef,
      onProgress: setLoadingProgress,
      onOverlayHidden: () => setShowOverlay(false),
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

      postProcessing.composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      hover.dispose();
      disposeTable();
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

    // 플레이어 핸드 (Z: +1.6)
    animateHand(playerHand, 'P', 1.6, cardsMap, scene, cardGeo, sideGlassMat);
    // 딜러 핸드 (Z: -1.6)
    animateHand(dealerHand, 'D', -1.6, cardsMap, scene, cardGeo, sideGlassMat);
  }, [playerHand, dealerHand]);

  // ─────────────────────────────────────────────
  // Effect 3: 승패 포스트 프로세싱 제어
  // ─────────────────────────────────────────────
  useEffect(() => {
    const pp = composerRef.current;
    if (!pp) return;
    const { chromaPass, glitchPass } = pp;

    if (winner === 'player') {
      // 플레이어 승리: 레인보우 색수차 프리즘 효과
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0;
      gsap.timeline()
        .to(chromaPass.uniforms.uAmount, { value: 0.035, duration: 0.3, ease: 'power2.out' })
        .to(chromaPass.uniforms.uAmount, { value: 0.0, duration: 1.5, ease: 'power1.inOut' });
    } else if (winner === 'dealer') {
      // 딜러 승리: 지지직거리는 화면 결함(Glitch)
      glitchPass.enabled = true;
      glitchPass.goWild = false;
      const timer = setTimeout(() => { glitchPass.enabled = false; }, 950);
      return () => clearTimeout(timer);
    } else {
      // 무승부 또는 게임 진행 중: 모든 효과 초기화
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0.0;
      glitchPass.enabled = false;
    }
  }, [winner, stage]);

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
