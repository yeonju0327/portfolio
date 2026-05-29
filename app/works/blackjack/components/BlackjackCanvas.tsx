'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { Card } from '../hooks/useBlackjack';
import { createCardFaceTexture, createCardBackTexture } from '../logic/TextureGenerator';
import { soundManager } from '../logic/SoundManager';

// 포스트 프로세싱 임포트 추가
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

// RGBELoader 추가
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

interface BlackjackCanvasProps {
  playerHand: Card[];
  dealerHand: Card[];
  stage: string;
  winner: 'player' | 'dealer' | 'push' | null;
}

// 승리 시 프리즘 색수차(Chromatic Aberration) 연출용 커스텀 셰이더
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      // 렌즈 외곽으로 갈수록 더 심하게 찢어지도록 설계
      vec2 dist = vUv - 0.5;
      vec2 offset = dist * uAmount;
      vec4 r = texture2D(tDiffuse, vUv + offset);
      vec4 g = texture2D(tDiffuse, vUv);
      vec4 b = texture2D(tDiffuse, vUv - offset);
      gl_FragColor = vec4(r.r, g.g, b.b, g.a);
    }
  `
};

export default function BlackjackCanvas({ playerHand, dealerHand, stage, winner }: BlackjackCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // 포스트 프로세싱 및 HDR 환경맵 관련 ref 보관소
  const composerRef = useRef<EffectComposer | null>(null);
  const chromaPassRef = useRef<ShaderPass | null>(null);
  const glitchPassRef = useRef<GlitchPass | null>(null);
  
  // 텍스처 및 배경 메쉬 해제 관리를 위한 ref
  const hdrTextureRef = useRef<THREE.Texture | null>(null);
  const envMapRef = useRef<THREE.Texture | null>(null);
  const bgGeometryRef = useRef<THREE.SphereGeometry | null>(null);
  const bgMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  
  // 생성된 카드 그룹들의 보관소
  const cardsMapRef = useRef<Map<string, THREE.Group>>(new Map());
  
  // 마우스 인터랙션을 위한 pointer 좌표 및 raycaster
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2(-9999, -9999));
  const hoveredCardRef = useRef<THREE.Group | null>(null);

  // 로딩 상태 및 오버레이 관리용 React State
  const [loadingProgress, setLoadingProgress] = React.useState<number>(0);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  const [showOverlay, setShowOverlay] = React.useState<boolean>(true);

  // 오버레이 및 스피너 DOM Ref
  const overlayRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);

  // 스피너 GSAP 무한 회전
  useEffect(() => {
    if (showOverlay && spinnerRef.current) {
      const tween = gsap.to(spinnerRef.current, {
        rotation: 360,
        duration: 1.2,
        repeat: -1,
        ease: 'none'
      });
      return () => {
        tween.kill();
      };
    }
  }, [showOverlay]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000'); // 완전히 까만 배경 바탕
    scene.fog = new THREE.FogExp2('#000000', 0.06);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 7.8, 6.8);
    cameraRef.current = camera;

    // 3. WebGLRenderer & Post-Processing Composer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // 대비를 극대화하는 그림자 맵핑을 완전히 비활성화 (true -> false)
    renderer.toneMapping = THREE.ReinhardToneMapping; // 하이라이트를 압축하여 이미지 대비를 대폭 플랫하게 변경 (ACES -> Reinhard)
    renderer.toneMappingExposure = 0.1; // 로딩 중에는 어두운 상태로 진입 (로딩 완료 시 스무스하게 밝아짐)
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // UnrealBloomPass 설정 (대비를 완전히 없애기 위해 빛번짐 패스는 생성하되 컴포저 추가는 제외합니다)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.0,   // strength 0.0
      0.0,   // radius 0.0
      1.0    // threshold 1.0
    );
    // composer.addPass(bloomPass); // 블룸 후처리 패스 완전히 제외하여 대비 차단

    // Chromatic Aberration (색수차) 패스 설정
    const chromaPass = new ShaderPass(ChromaticAberrationShader);
    composer.addPass(chromaPass);

    // GlitchPass 설정 (패배 시 지지직거리는 노이즈 효과)
    const glitchPass = new GlitchPass();
    glitchPass.enabled = false;
    composer.addPass(glitchPass);

    composerRef.current = composer;
    chromaPassRef.current = chromaPass;
    glitchPassRef.current = glitchPass;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 3.2;
    controls.maxDistance = 11;
    controls.target.set(0, 0, 0);

    // 5. Lights (전반적인 3D 밝기를 중간값으로 조율하여 입체감과 눈보호 양립)
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.80); // 1.0 -> 0.80으로 낮춰 간접광을 조절하고 기저 명암 확보
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.45); // 0.0 -> 0.45로 올려 은은한 3D 반사 윤곽선 복원 (그림자는 꺼진 상태 유지)
    dirLight.position.set(5, 12, 5);
    scene.add(dirLight);

    // 푸른 반사광 (대비 중간값 조율)
    const cyanLight = new THREE.PointLight('#00E5FF', 1.2, 16); // 0.0 -> 1.2로 복원
    cyanLight.position.set(-6, 4, 3);
    scene.add(cyanLight);

    // 골드 하이라이트광 (대비 중간값 조율)
    const goldLight = new THREE.PointLight('#FFC107', 0.9, 16); // 0.0 -> 0.9로 복원
    goldLight.position.set(6, 4, -3);
    scene.add(goldLight);

    // 6. HDR 환경 맵 로더 가동 (RGBELoader)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader()
      .setDataType(THREE.HalfFloatType)
      .load(
        '/images/citrus_orchard_road_puresky_2k.hdr',
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          
          // scene.background 대신 거대 돔 메쉬를 씬에 배치하여 직접 톤매핑 및 명도 제어
          scene.background = null;
          scene.environment = envMap; // 광학적인 반사 및 유리 굴절 기여
          
          const bgGeo = new THREE.SphereGeometry(50, 32, 32);
          const bgMat = new THREE.MeshBasicMaterial({
            map: texture, // PMREM으로 압축 가공된 envMap 대신 원본 Equirectangular texture를 바인딩하여 매핑 왜곡 방지
            side: THREE.BackSide,
            depthWrite: false,
            transparent: true,
            opacity: 0.80, // 0.65 -> 0.80으로 상향하여 배경의 가시성 회복
            color: new THREE.Color(0.65, 0.65, 0.65), // 0.35 -> 0.65로 어두운 회색 곱셈 강도를 풀어 노을의 예쁜 감귤빛 톤을 중간값으로 복원
            fog: false // 안개의 감쇄 효과를 받지 않도록 비활성화
          });
          const bgMesh = new THREE.Mesh(bgGeo, bgMat);
          scene.add(bgMesh);

          bgGeometryRef.current = bgGeo;
          bgMaterialRef.current = bgMat;
          
          hdrTextureRef.current = texture;
          envMapRef.current = envMap;

          // 서서히 씬 노출을 올려 눈부심 없이 부드러운 전환 연출 (중간값 조율해 밝기 복원)
          gsap.to(renderer, {
            toneMappingExposure: 0.95, // 0.65 -> 0.95로 복원하여 유리의 영롱한 투명 질감을 화사하게 살림
            duration: 1.2,
            ease: 'power2.out'
          });

          // 로딩 완료 후 오버레이 페이드아웃
          setIsLoaded(true);
          if (overlayRef.current) {
            gsap.to(overlayRef.current, {
              opacity: 0,
              duration: 0.8,
              ease: 'power2.out',
              onComplete: () => {
                setShowOverlay(false);
              }
            });
          }

          pmremGenerator.dispose();
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            setLoadingProgress(percent);
          }
        },
        (err) => {
          console.error('HDR Environment map load error:', err);
          // 로드 실패 시에도 게임 진행이 가능하도록 강제 복구
          setIsLoaded(true);
          setShowOverlay(false);
          renderer.toneMappingExposure = 1.25;
          pmremGenerator.dispose();
        }
      );

    // 7. 카드 구역 가이드 박스 라인 (대각선 X자 없이 외각 테두리만 흰색 실선으로 렌더링)
    const guideGeo = new THREE.PlaneGeometry(6.5, 2.6);
    const edgesGeo = new THREE.EdgesGeometry(guideGeo);
    const borderMat = new THREE.LineBasicMaterial({ 
      color: '#FFFFFF', 
      transparent: true, 
      opacity: 0.24 
    });

    const dealerGuide = new THREE.LineSegments(edgesGeo, borderMat);
    dealerGuide.rotation.x = -Math.PI / 2;
    dealerGuide.position.set(0, 0.01, -1.7);
    scene.add(dealerGuide);

    const playerGuide = new THREE.LineSegments(edgesGeo, borderMat);
    playerGuide.rotation.x = -Math.PI / 2;
    playerGuide.position.set(0, 0.01, 1.7);
    scene.add(playerGuide);

        // 7-2. 우측 상단 덱 쌓인 더미 가이드 (초기 스폰 덱 시각 메타포)
    const deckDummyGeo = new THREE.BoxGeometry(1.55, 0.25, 2.25);
    const deckDummyMat = new THREE.MeshStandardMaterial({
      color: '#071609',
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 0.8
    });
    const deckDummy = new THREE.Mesh(deckDummyGeo, deckDummyMat);
    deckDummy.position.set(3.5, 0.12, -3.2); // 덱 위치 설정
    scene.add(deckDummy);

    // 8. 마우스 이동 리스너 (정규화된 디바이스 좌표 [-1, 1] 갱신)
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

    // 8-2. Window Resize 대응
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (composerRef.current) {
        composerRef.current.setSize(width, height);
      }
    };
    window.addEventListener('resize', handleResize);

    // 9. Raycaster 인터랙션 및 Render 렌더 루프
    const raycaster = new THREE.Raycaster();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      const time = Date.now() * 0.0006;

      // 광원 미세 춤
      cyanLight.position.x = -6 + Math.sin(time * 1.1) * 1.8;
      cyanLight.position.z = 3 + Math.cos(time * 0.8) * 1.8;
      goldLight.position.x = 6 + Math.cos(time * 1.2) * 1.8;
      goldLight.position.z = -3 + Math.sin(time * 0.9) * 1.8;

      // 9-1. Raycasting 카드 호버 틸트 상호작용
      if (pointerRef.current.x !== -9999) {
        raycaster.setFromCamera(pointerRef.current, camera);
        
        // cardsMapRef 내 카드 그룹들의 자식 메쉬 스캔
        const targetMeshes: THREE.Object3D[] = [];
        cardsMapRef.current.forEach((group) => {
          // 그룹 내부의 첫번째 자식(메인 카드 메쉬)을 타겟으로 함
          if (group.children[0]) {
            targetMeshes.push(group.children[0]);
          }
        });

        const intersects = raycaster.intersectObjects(targetMeshes);

        if (intersects.length > 0) {
          // 메인 메쉬의 부모인 Group 확보
          const cardGroup = intersects[0].object.parent as THREE.Group;
          
          if (hoveredCardRef.current !== cardGroup) {
            hoveredCardRef.current = cardGroup;
          }

          // 마우스 오프셋에 비례한 3D 틸팅 계산 (동적 흔들림 피드백)
          const intersectionPoint = intersects[0].point;
          const groupPos = cardGroup.position;
          
          // 상대적 마우스 좌표 거리 계산
          const dx = intersectionPoint.x - groupPos.x;
          const dz = intersectionPoint.z - groupPos.z;

          // 보간(Lerp)을 사용하여 틸팅 위치 부드럽게 업데이트 (뚝뚝 끊김 방지)
          // Y 높이 들썩임 (위에 적재된 카드를 뚫고 올라가지 않도록 탑 카드만 0.25만큼 들썩이고, 아래 카드는 0.04로 제한)
          const index = cardGroup.userData.index ?? 0;
          const handLength = cardGroup.userData.handLength ?? 1;
          const isTopCard = index === handLength - 1;
          const liftAmount = isTopCard ? 0.25 : 0.04;

          const baseTargetY = cardGroup.userData.originalY ?? groupPos.y;
          cardGroup.position.y = THREE.MathUtils.lerp(groupPos.y, baseTargetY + liftAmount, 0.15);

          // 기울기 틸트 (원래의 엇갈린 Z축 회전을 반영하여 x축, z축 미세 변동)
          const origRotX = cardGroup.userData.originalRotX ?? -Math.PI / 2;
          const origRotZ = cardGroup.userData.originalRotZ ?? 0;
          const targetRotX = origRotX + dz * 0.15;
          const targetRotZ = origRotZ + dx * -0.15;
          cardGroup.rotation.x = THREE.MathUtils.lerp(cardGroup.rotation.x, targetRotX, 0.12);
          cardGroup.rotation.z = THREE.MathUtils.lerp(cardGroup.rotation.z, targetRotZ, 0.12);
        } else {
          // 호버 대상이 없을 때 복구
          restoreHoveredCard();
        }
      } else {
        restoreHoveredCard();
      }

      // 다른 호버되지 않은 카드들의 부드러운 복귀 처리 (Lerp 루프)
      cardsMapRef.current.forEach((group) => {
        if (group !== hoveredCardRef.current) {
          const origY = group.userData.originalY ?? group.position.y;
          const origRotX = group.userData.originalRotX ?? group.rotation.x;
          const origRotZ = group.userData.originalRotZ ?? 0;
          
          // 정렬 위치 및 원래의 엇갈림 회전 각도로 부드러운 회귀
          group.position.y = THREE.MathUtils.lerp(group.position.y, origY, 0.1);
          group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, origRotX, 0.1);
          group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, origRotZ, 0.1);
        }
      });

      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    const restoreHoveredCard = () => {
      if (hoveredCardRef.current) {
        hoveredCardRef.current = null;
      }
    };

    animate();

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      borderMat.dispose();
      guideGeo.dispose();
      edgesGeo.dispose();
      deckDummyGeo.dispose();
      deckDummyMat.dispose();
      
      // 배경 구체 메쉬 리소스 정리
      if (bgGeometryRef.current) {
        bgGeometryRef.current.dispose();
        bgGeometryRef.current = null;
      }
      if (bgMaterialRef.current) {
        bgMaterialRef.current.dispose();
        bgMaterialRef.current = null;
      }

      // HDR 환경 맵 리소스 정리
      if (hdrTextureRef.current) {
        hdrTextureRef.current.dispose();
        hdrTextureRef.current = null;
      }
      if (envMapRef.current) {
        envMapRef.current.dispose();
        envMapRef.current = null;
      }
      
      // 포스트 프로세싱 정리
      if (composerRef.current) {
        composerRef.current.dispose();
        composerRef.current = null;
      }
      chromaPassRef.current = null;
      glitchPassRef.current = null;

      renderer.dispose();
    };
  }, []);

  // 10. 카드 동적 애니메이션 결합 (GSAP + Sound)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const cardsMap = cardsMapRef.current;

    const activeIds = new Set<string>();
    playerHand.forEach(c => activeIds.add(`P_${c.id}`));
    dealerHand.forEach(c => activeIds.add(`D_${c.id}`));

    // 제거된 카드 청소
    cardsMap.forEach((group, id) => {
      if (!activeIds.has(id)) {
        scene.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        cardsMap.delete(id);
      }
    });

    const cardWidth = 1.45;
    const cardHeight = 2.15;
    const cardThickness = 0.06; // 두께를 절반으로 축소
    const cardGeo = new RoundedBoxGeometry(cardWidth, cardHeight, cardThickness, 4, 0.05);

    const sideGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#b2f2fc', // 겹쳐졌을 때 색 뭉침을 막기 위해 더 밝고 화사한 청록빛 틴트 적용
      metalness: 0.02,
      roughness: 0.06, // 미세하게 헤이즈 질감을 추가해 뽀얀 연무 유리 표현
      transmission: 0.85, // 투과율을 85%로 조절하여 겹쳤을 때 아래 카드가 자연스럽게 뿌옇게 가려지도록 튜닝
      thickness: cardThickness,
      ior: 1.52,
      transparent: false,
      depthWrite: false,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    });

    const buildCardGroup = (card: Card) => {
      const group = new THREE.Group();

      const faceTex = createCardFaceTexture(card.value, card.suit);
      if (faceTex) faceTex.anisotropy = 16;

      const backTex = createCardBackTexture();
      if (backTex) backTex.anisotropy = 16;

      // 1. 단일 통유리판 메쉬 생성 (6면 전체 sideGlassMat 적용해 100% 굴절 및 투과 유리 구현)
      const cardMesh = new THREE.Mesh(cardGeo, sideGlassMat);
      cardMesh.castShadow = false;
      cardMesh.receiveShadow = false;
      group.add(cardMesh);

      // 2. 앞면 잉크 데칼 얹기 (입체 굴절의 왜곡을 받지 않도록 얇은 평면 오버레이)
      if (faceTex) {
        const decalGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
        const faceDecalMat = new THREE.MeshBasicMaterial({
          map: faceTex,
          transparent: true,
          opacity: 1.0,
          depthWrite: true,
          depthTest: true
        });
        const faceDecal = new THREE.Mesh(decalGeo, faceDecalMat);
        faceDecal.position.set(0, 0, cardThickness / 2 + 0.002); // 앞 표면에 찰딱 붙임
        group.add(faceDecal);
      }

      // 3. 뒷면 잉크 데칼 얹기 (뒤집힌 형태, Y축 180도 회전)
      if (backTex) {
        const decalGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
        const backDecalMat = new THREE.MeshBasicMaterial({
          map: backTex,
          transparent: true,
          opacity: 1.0,
          depthWrite: true,
          depthTest: true
        });
        const backDecal = new THREE.Mesh(decalGeo, backDecalMat);
        backDecal.position.set(0, 0, -(cardThickness / 2 + 0.002)); // 뒷 표면에 찰딱 붙임
        backDecal.rotation.y = Math.PI;
        group.add(backDecal);
      }

      // 4. 샌드위치 Opaque Core (뒤집혀 숨겨진 동안만 활성화)
      const coreGeo = new THREE.BoxGeometry(cardWidth - 0.04, cardHeight - 0.04, 0.005);
      const coreMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 1.0,
        depthWrite: true
      });
      const depthCore = new THREE.Mesh(coreGeo, coreMat);
      depthCore.name = 'depthCore';
      depthCore.position.set(0, 0, 0);
      depthCore.visible = !!card.isHidden; // 뒤집힌 비공개 상태인 경우에만 불투명 처리
      group.add(depthCore);

      return group;
    };

    // 10-2. 초기 스폰지점 (덱 가이드 위치)
    const deckSpawnX = 3.5;
    const deckSpawnY = 1.0;
    const deckSpawnZ = -3.2;

    // 10-3. 플레이어 카드 처리
    playerHand.forEach((card, index) => {
      const cardId = `P_${card.id}`;
      let cardGroup = cardsMap.get(cardId);
      
      const totalCount = playerHand.length;
      const spacing = 0.52;
      const startX = -((totalCount - 1) * spacing) / 2;
      const targetX = startX + index * spacing;
      
      // 두께감이 느껴지도록 Y 단차를 확실하게 포갬
      const targetY = 0.03 + index * 0.035;
      const targetZ = 1.6;
      const targetRotX = -Math.PI / 2;
      
      // 첫 카드는 평평하게 눕히고, 그 이후 카드는 왼쪽에 놓인 카드 위로 얹어지므로 왼쪽이 들리도록 Z축 음수 회전 적용 (-0.07 라디안)
      const targetRotZ = index === 0 ? 0 : -0.07;

      if (!cardGroup) {
        // 새 카드가 딜링되는 단계
        cardGroup = buildCardGroup(card);
        
        // 초기 덱 위치에 스폰
        cardGroup.position.set(deckSpawnX, deckSpawnY, deckSpawnZ);
        cardGroup.rotation.set(Math.PI / 2, 0, Math.PI / 6); // 덱 위에 엎어져 기울어진 각도
        
        scene.add(cardGroup);
        cardsMap.set(cardId, cardGroup);

        // GSAP 물리 딜링 슬라이딩 애니메이션 실행
        const dealDelay = (card.dealOrder ?? index) * 0.22;
        
        // 날아가기 전 슬라이딩 마찰음 트리거
        setTimeout(() => {
          soundManager.playSlide();
        }, dealDelay * 1000);

        gsap.to(cardGroup.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 0.7,
          delay: dealDelay,
          ease: 'back.out(1.1)', // 묵직하게 쿵 튕기는 바닥 탄성 표현
          onComplete: () => {
            soundManager.playClink(); // 테이블에 안착 시 유리 타격음 발생!
          }
        });

        gsap.to(cardGroup.rotation, {
          x: targetRotX,
          y: 0,
          z: targetRotZ, // Z축 회전 적용
          duration: 0.7,
          delay: dealDelay,
          ease: 'power2.out'
        });
      } else {
        // 이미 딜링이 끝난 카드는 목표 정렬 공식에 의해 위치 및 회전 부드럽게 미세 보정 (리렌더 튐 방지)
        gsap.to(cardGroup.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 0.3,
          ease: 'power2.out'
        });
        gsap.to(cardGroup.rotation, {
          z: targetRotZ,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      // 원래 정렬값 캐싱 (Raycaster 복구 시 참조)
      cardGroup.userData.originalX = targetX;
      cardGroup.userData.originalY = targetY;
      cardGroup.userData.originalRotX = targetRotX;
      cardGroup.userData.originalRotZ = targetRotZ;
      cardGroup.userData.index = index;
      cardGroup.userData.handLength = totalCount;

      // depthCore 가시성 업데이트 (플레이어 카드는 항상 투명)
      const depthCore = cardGroup.getObjectByName('depthCore');
      if (depthCore) {
        depthCore.visible = !!card.isHidden;
      }

      // Depth 렌더 오더 순서 정렬
      cardGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.renderOrder = (card.dealOrder ?? index) + 10;
        }
      });
    });

    // 10-4. 딜러 카드 처리
    dealerHand.forEach((card, index) => {
      const cardId = `D_${card.id}`;
      let cardGroup = cardsMap.get(cardId);

      const totalCount = dealerHand.length;
      const spacing = 0.52;
      const startX = -((totalCount - 1) * spacing) / 2;
      const targetX = startX + index * spacing;
      
      // 두께감이 느껴지도록 Y 단차를 확실하게 포갬
      const targetY = 0.03 + index * 0.035;
      const targetZ = -1.6;
      
      // 첫 카드는 평평하게 눕히고, 그 이후 카드는 왼쪽에 놓인 카드 위로 얹어지므로 왼쪽이 들리도록 Z축 음수 회전 적용 (-0.07 라디안)
      const targetRotZ = index === 0 ? 0 : -0.07;
      
      const targetRotX = card.isHidden ? Math.PI / 2 : -Math.PI / 2; // 뒤집힘 유무에 따른 Y축 180도 회전

      if (!cardGroup) {
        cardGroup = buildCardGroup(card);
        cardGroup.position.set(deckSpawnX, deckSpawnY, deckSpawnZ);
        cardGroup.rotation.set(Math.PI / 2, 0, Math.PI / 6);
        
        scene.add(cardGroup);
        cardsMap.set(cardId, cardGroup);

        const dealDelay = (card.dealOrder ?? index) * 0.22;

        setTimeout(() => {
          soundManager.playSlide();
        }, dealDelay * 1000);

        gsap.to(cardGroup.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 0.7,
          delay: dealDelay,
          ease: 'back.out(1.1)',
          onComplete: () => {
            soundManager.playClink();
          }
        });

        gsap.to(cardGroup.rotation, {
          x: targetRotX,
          y: 0,
          z: targetRotZ, // Z축 회전 적용
          duration: 0.7,
          delay: dealDelay,
          ease: 'power2.out'
        });
      } else {
        // 이미 딜링이 끝난 카드의 위치 및 Z 회전 보정
        gsap.to(cardGroup.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 0.3,
          ease: 'power2.out'
        });
        gsap.to(cardGroup.rotation, {
          z: targetRotZ,
          duration: 0.3,
          ease: 'power2.out'
        });

        // 딜러 홀 카드가 뒤집히는 경우 (isHidden 이 true -> false 로 전환)
        const currentRotX = cardGroup.rotation.x;
        // 각도 차가 클 때만 플립 회전 트윈 가동
        if (Math.abs(currentRotX - targetRotX) > 0.1) {
          const depthCore = cardGroup.getObjectByName('depthCore');
          if (depthCore) {
            // 뒤집히기 시작할 때 즉시 코어 투명화/불투명화 적용
            depthCore.visible = !!card.isHidden;
          }

          gsap.to(cardGroup.rotation, {
            x: targetRotX,
            duration: 0.6,
            ease: 'back.out(1.2)', // 묵직하게 넘어가 튕기는 피드백
            onComplete: () => {
              soundManager.playClink(); // 플립 안착 타격음
            }
          });
        } else {
          cardGroup.rotation.x = targetRotX;
          const depthCore = cardGroup.getObjectByName('depthCore');
          if (depthCore) {
            depthCore.visible = !!card.isHidden;
          }
        }
      }

      cardGroup.userData.originalX = targetX;
      cardGroup.userData.originalY = targetY;
      cardGroup.userData.originalRotX = targetRotX;
      cardGroup.userData.originalRotZ = targetRotZ;
      cardGroup.userData.index = index;
      cardGroup.userData.handLength = totalCount;
      cardGroup.userData.isDealer = true;

      // depthCore 가시성 업데이트
      const depthCore = cardGroup.getObjectByName('depthCore');
      if (depthCore) {
        depthCore.visible = !!card.isHidden;
      }

      cardGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.renderOrder = (card.dealOrder ?? index) + 10;
        }
      });
    });

  }, [playerHand, dealerHand]);

  // 11. 승패 연출 포스트 프로세싱 제어
  useEffect(() => {
    const chromaPass = chromaPassRef.current;
    const glitchPass = glitchPassRef.current;

    if (!chromaPass || !glitchPass) return;

    if (winner === 'player') {
      // 플레이어 승리: 레인보우 색수차 프리즘 효과 발생
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0;
      gsap.timeline()
        .to(chromaPass.uniforms.uAmount, {
          value: 0.035, // 렌즈 가장자리 찢어짐 극대화
          duration: 0.3,
          ease: 'power2.out'
        })
        .to(chromaPass.uniforms.uAmount, {
          value: 0.0,
          duration: 1.5,
          ease: 'power1.inOut'
        });
    } else if (winner === 'dealer') {
      // 플레이어 패배 (딜러 승리): 지지직거리는 화면 결함 (Glitch)
      glitchPass.enabled = true;
      glitchPass.goWild = false; // 기본 글리치
      
      // 약 0.95초간 지지직거린 뒤 부드럽게 복원
      const timer = setTimeout(() => {
        glitchPass.enabled = false;
      }, 950);

      return () => clearTimeout(timer);
    } else {
      // 무승부(push) 또는 게임 진행 중: 모든 효과 초기화
      gsap.killTweensOf(chromaPass.uniforms.uAmount);
      chromaPass.uniforms.uAmount.value = 0.0;
      glitchPass.enabled = false;
    }
  }, [winner, stage]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        position: 'relative'
      }} 
    >
      {showOverlay && (
        <div
          ref={overlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(5, 12, 22, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99,
            color: '#FFFFFF',
            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
          }}
        >
          {/* 아날로그-디지털 톤의 원형 프로그레스 로더 */}
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div 
              ref={spinnerRef}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '3.5px solid rgba(255, 255, 255, 0.08)',
                borderTop: '3.5px solid #00E5FF',
                borderRight: '3.5px solid #FFC107',
                borderRadius: '50%'
              }} 
            />
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#00E5FF',
              textShadow: '0 0 12px rgba(0, 229, 255, 0.6)'
            }}>
              {loadingProgress}%
            </span>
          </div>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            letterSpacing: '2.5px',
            margin: '0 0 8px 0',
            color: '#E2E8F0',
            textTransform: 'uppercase'
          }}>
            Calibrating the Stars
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#718096',
            margin: 0,
            letterSpacing: '1px'
          }}>
            Rendering celestial spheres... ({Math.min(4.98, Number((4.98 * loadingProgress / 100).toFixed(2)))} MB / 4.98 MB)
          </p>
        </div>
      )}
    </div>
  );
}
