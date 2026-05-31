import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ChromaticAberrationShader } from './shaders';

export interface PostProcessingResult {
  composer: EffectComposer;
  chromaPass: ShaderPass;
  dispose: () => void;
}

/**
 * EffectComposer 및 포스트 프로세싱 패스(Chroma, Glitch)를 초기화합니다.
 * BloomPass는 대비 완전 차단 목적으로 생성하되 컴포저에 추가하지 않습니다.
 */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number }
): PostProcessingResult {
  const composer = new EffectComposer(renderer);

  // 기본 렌더 패스
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // UnrealBloomPass (strength 0.0, 컴포저 추가 제외로 블룸 효과 완전 차단)
  const _bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.width, size.height),
    0.0, // strength
    0.0, // radius
    1.0  // threshold
  );
  void _bloomPass;

  // 색수차 패스 (승리 시 프리즘 연출)
  const chromaPass = new ShaderPass(ChromaticAberrationShader);
  composer.addPass(chromaPass);

  const dispose = () => {
    composer.dispose();
  };

  return { composer, chromaPass, dispose };
}
