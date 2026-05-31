import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { gsap } from 'gsap';

export interface EnvironmentLoaderOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  /** 로딩 오버레이 DOM ref — GSAP 페이드아웃 타겟 */
  overlayRef: { current: HTMLDivElement | null };
  onProgress: (percent: number) => void;
  onOverlayHidden: () => void;
  onLoad?: () => void;
}

/**
 * 로드된 자원을 추적하여 언마운트 시 정리할 수 있도록 합니다.
 * 비동기 로드 완료 후 해당 필드가 채워집니다.
 */
export interface EnvironmentRefs {
  hdrTexture: THREE.Texture | null;
  envMap: THREE.Texture | null;
  bgGeometry: THREE.SphereGeometry | null;
  bgMaterial: THREE.MeshBasicMaterial | null;
}

/**
 * RGBELoader로 HDR 환경맵을 로드하고, 씬에 배경 구체 메쉬를 추가합니다.
 * 반환된 EnvironmentRefs 객체는 비동기 로드 완료 시 채워집니다.
 */
export function loadEnvironment(opts: EnvironmentLoaderOptions): EnvironmentRefs {
  const refs: EnvironmentRefs = {
    hdrTexture: null,
    envMap: null,
    bgGeometry: null,
    bgMaterial: null,
  };

  const pmremGenerator = new THREE.PMREMGenerator(opts.renderer);
  pmremGenerator.compileEquirectangularShader();

  new RGBELoader()
    .setDataType(THREE.HalfFloatType)
    .load(
      '/images/citrus_orchard_road_puresky_2k.hdr',
      (texture) => {
        // 수평 회전 offset을 적용하여 배경 및 반사상을 시계 방향으로 회전시킴 (이전 상태에서 90도 시계 방향 추가 변환)
        texture.wrapS = THREE.RepeatWrapping;
        texture.offset.x = -0.125;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;

        // scene.background 대신 거대 돔 메쉬를 씬에 배치하여 직접 톤매핑 및 명도 제어
        opts.scene.background = null;
        opts.scene.environment = envMap; // 광학적인 반사 및 유리 굴절 기여

        const bgGeo = new THREE.SphereGeometry(50, 32, 32);
        const bgMat = new THREE.MeshBasicMaterial({
          map: texture, // 원본 Equirectangular texture 바인딩하여 매핑 왜곡 방지
          side: THREE.BackSide,
          depthWrite: false,
          transparent: true,
          opacity: 0.80,
          color: new THREE.Color(0.65, 0.65, 0.65), // 노을의 예쁜 감귤빛 톤을 중간값으로 복원
          fog: false, // 안개 감쇄 효과 비활성화
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        opts.scene.add(bgMesh);

        // refs 채우기 (cleanup 시 dispose용)
        refs.bgGeometry = bgGeo;
        refs.bgMaterial = bgMat;
        refs.hdrTexture = texture;
        refs.envMap = envMap;

        if (opts.onLoad) {
          opts.onLoad();
        }

        // 서서히 씬 노출을 올려 눈부심 없이 부드러운 전환
        gsap.to(opts.renderer, {
          toneMappingExposure: 0.95,
          duration: 1.2,
          ease: 'power2.out',
        });

        // 오버레이 페이드아웃
        if (opts.overlayRef.current) {
          gsap.to(opts.overlayRef.current, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: opts.onOverlayHidden,
          });
        } else {
          opts.onOverlayHidden();
        }

        pmremGenerator.dispose();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percent = Math.floor((xhr.loaded / xhr.total) * 100);
          opts.onProgress(percent);
        }
      },
      (err) => {
        console.error('HDR Environment map load error:', err);
        // 로드 실패 시에도 게임 진행이 가능하도록 강제 복구
        opts.onOverlayHidden();
        opts.renderer.toneMappingExposure = 1.25;
        pmremGenerator.dispose();
      }
    );

  return refs;
}

/** 환경맵 관련 Three.js 리소스를 해제합니다. */
export function disposeEnvironment(refs: EnvironmentRefs): void {
  refs.bgGeometry?.dispose();
  refs.bgMaterial?.dispose();
  refs.hdrTexture?.dispose();
  refs.envMap?.dispose();
}
