import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneSetupResult {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  cyanLight: THREE.PointLight;
  goldLight: THREE.PointLight;
  dispose: () => void;
}

/**
 * Three.js 씬의 핵심 구성 요소(Scene, Camera, Renderer, Controls, Lights)를 초기화합니다.
 */
export function createSceneSetup(container: HTMLDivElement): SceneSetupResult {
  // 씬 & 포그
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.FogExp2('#000000', 0.015);

  // 카메라
  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 7.8, 6.8);

  // 렌더러
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 0.1; // 로딩 완료 시 gsap으로 서서히 밝아짐
  container.appendChild(renderer.domElement);

  // OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minDistance = 3.2;
  controls.maxDistance = 9.8; // 배경 감귤빛 노을 돔 이탈 방지를 위한 줌아웃 한계 단축
  controls.enablePan = false; // 화면 수평 이동 차단 (바닥 밑 수몰 및 월드 탈출 방지)
  controls.target.set(0, 0, 0);

  // 광원 — 전반적인 3D 밝기를 중간값으로 조율하여 입체감과 눈보호 양립
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.80);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight('#ffffff', 0.45);
  dirLight.position.set(5, 12, 5);
  scene.add(dirLight);

  // 푸른 반사광 (좌측, 애니메이션 루프에서 미세 움직임 적용)
  const cyanLight = new THREE.PointLight('#00E5FF', 1.2, 16);
  cyanLight.position.set(-6, 4, 3);
  scene.add(cyanLight);

  // 골드 하이라이트광 (우측, 애니메이션 루프에서 미세 움직임 적용)
  const goldLight = new THREE.PointLight('#FFC107', 0.9, 16);
  goldLight.position.set(6, 4, -3);
  scene.add(goldLight);

  const dispose = () => {
    controls.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
    renderer.dispose();
  };

  return { scene, camera, renderer, controls, cyanLight, goldLight, dispose };
}
