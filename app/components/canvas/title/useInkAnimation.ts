import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import Konva from "konva";

export const useInkAnimation = (id: string, color: string, size: number, delay: number, isDraggingActive?: boolean, isSelected?: boolean, isRestored?: boolean) => {
  const mainGroupRef = useRef<import("konva/lib/Group").Group>(null);
  const inkSpreadRef = useRef<import("konva/lib/shapes/Ring").Ring>(null);
  const imageRef = useRef<import("konva/lib/shapes/Image").Image>(null);
  const captionRef = useRef<import("konva/lib/shapes/Text").Text>(null);
  const iconRef = useRef<import("konva/lib/Group").Group>(null);
  const filterLayerRef = useRef<HTMLDivElement>(null);

  const filterTweenRef = useRef<gsap.core.Tween | null>(null);
  const mainProgressRef = useRef({ scale: 0 });
  const hoverProxy = useRef({ inner: 0, filterScale: 20 });

  const isReadyRef = useRef(false);
  const isDraggingRef = useRef(isDraggingActive);
  const isNodeClickedRef = useRef(false);
  const hoverState = useRef<'none' | 'proximate' | 'full'>('none');
  const isMouseOverRef = useRef(false);

  const HOVER_INNER_RADIUS = size - 15;
  const ICON_SCALE = (size / 85) * 1.8;
  const rgb = Konva.Util.getRGB(color) || { r: 0, g: 0, b: 0 };

  // ✨ [성능 최적화 #4] gsap.ticker 더티 체크용 ref — 값 변화가 없으면 매 프레임 연산 스킵
  const prevGradientKeyRef = useRef('');

  const applyCurrentValues = useCallback((force = false) => {
    if (!inkSpreadRef.current) return;

    const mainAlpha = mainProgressRef.current.scale;
    const dirtyKey = `${hoverProxy.current.inner.toFixed(2)}_${hoverProxy.current.filterScale.toFixed(2)}_${mainAlpha.toFixed(3)}`;
    if (!force && dirtyKey === prevGradientKeyRef.current) return;
    prevGradientKeyRef.current = dirtyKey;

    inkSpreadRef.current.innerRadius(hoverProxy.current.inner);
    
    const filterMap = document.getElementById(`disp-${id}`);
    if (filterMap) filterMap.setAttribute("scale", hoverProxy.current.filterScale.toString());

    // Gaussian blur stdDeviation 업데이트 (filterScale에 비례하여 1.2에서 0까지 동적 조절)
    const blurMap = document.getElementById(`blur-${id}`);
    if (blurMap) {
      const blurAmount = (hoverProxy.current.filterScale / 20) * 1.2;
      blurMap.setAttribute("stdDeviation", blurAmount.toString());
    }

    const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS;
    const smoothProgress = gsap.parseEase("power1.out")(progress);
    const stopPoint = 0.85 + (0.13 * smoothProgress);
    const fadeWidth = 1 - stopPoint;

    inkSpreadRef.current.fillRadialGradientColorStops([
      0, color, stopPoint, color,
      stopPoint + fadeWidth * 0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.6 * mainAlpha})`,
      stopPoint + fadeWidth * 0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.2 * mainAlpha})`,
      stopPoint + fadeWidth * 0.9, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.02 * mainAlpha})`,
      1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`,
    ]);
  }, [id, color, rgb.r, rgb.g, rgb.b, HOVER_INNER_RADIUS]);

  const updateGradient = useCallback(() => {
    applyCurrentValues(false);
  }, [applyCurrentValues]);

  const updateHoverState = useCallback((newState: 'none' | 'proximate' | 'full') => {
    if (isDraggingRef.current || !isReadyRef.current) return;
    if (isNodeClickedRef.current && newState !== 'full') return; 
    if (hoverState.current === newState) return;
    
    hoverState.current = newState;
    gsap.killTweensOf([mainGroupRef.current, imageRef.current, captionRef.current, iconRef.current]);
    if (filterTweenRef.current) filterTweenRef.current.kill();

    if (newState === 'full') {
      document.body.setAttribute('data-cursor', 'pointer');
      
      gsap.to(mainGroupRef.current, { scaleX: 1.15, scaleY: 1.15, duration: 0.25, ease: "power2.out" });
      gsap.to(imageRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.to(iconRef.current, { opacity: 0, duration: 0.25, ease: "power2.out" });
      if (captionRef.current) gsap.to(captionRef.current, { opacity: 1, y: size + 25, duration: 0.25, ease: "power2.out" });
      
      filterTweenRef.current = gsap.to(hoverProxy.current, { 
        inner: HOVER_INNER_RADIUS, 
        filterScale: 0, 
        duration: 0.25, 
        ease: "power2.out", 
        onUpdate: updateGradient 
      });

    } else if (newState === 'proximate') {
      document.body.setAttribute('data-cursor', 'proximate');

      gsap.to(mainGroupRef.current, { scaleX: 1.05, scaleY: 1.05, duration: 0.4, ease: "power2.out" });
      gsap.to(imageRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
      gsap.to(iconRef.current, { opacity: 0.8, duration: 0.4, ease: "power2.out" });
      if (captionRef.current) gsap.to(captionRef.current, { opacity: 0, y: size + 10, duration: 0.3, ease: "power2.out" }); 
      
      filterTweenRef.current = gsap.to(hoverProxy.current, { 
        inner: 0, 
        filterScale: 15, 
        duration: 0.4, 
        ease: "power2.out", 
        onUpdate: updateGradient 
      });

    } else {
      document.body.setAttribute('data-cursor', 'none');

      gsap.to(mainGroupRef.current, { scaleX: 1, scaleY: 1, duration: 0.35, ease: "power3.out" });
      gsap.to(imageRef.current, { opacity: 0, duration: 0.35, ease: "power3.out" });
      gsap.to(iconRef.current, { opacity: 0.35, duration: 0.35, ease: "power3.out" });
      if (captionRef.current) gsap.to(captionRef.current, { opacity: 0, y: size + 10, duration: 0.35, ease: "power3.out" });
      
      filterTweenRef.current = gsap.to(hoverProxy.current, { 
        inner: 0, 
        filterScale: 20, 
        duration: 0.35, 
        ease: "power3.out", 
        onUpdate: updateGradient 
      });
    }
  }, [updateGradient, HOVER_INNER_RADIUS, size]);

  // React 리렌더링 발생 시 React Konva가 기본값으로 초기화하는 것을 방지하기 위해 강제 동기화
  useEffect(() => {
    applyCurrentValues(true);
  });

  useEffect(() => {
    isNodeClickedRef.current = isSelected ?? false;
    
    if (isSelected) {
      updateHoverState('full');
    } else {
      updateHoverState(isMouseOverRef.current ? 'full' : 'none');
    }
  }, [isSelected, updateHoverState]);

  useEffect(() => {
    isDraggingRef.current = isDraggingActive;
    if (isDraggingActive && hoverState.current !== 'none') updateHoverState('none');
  }, [isDraggingActive, updateHoverState]);

  useEffect(() => {
    if (isRestored) {
      gsap.set(mainGroupRef.current, { scaleX: 1, scaleY: 1, opacity: 1 });
      gsap.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
      gsap.set(imageRef.current, { opacity: 0 });
      gsap.set(iconRef.current, { opacity: 0.35, scaleX: ICON_SCALE, scaleY: ICON_SCALE }); 
      if (captionRef.current) gsap.set(captionRef.current, { opacity: 0, y: size + 10 });
      
      mainProgressRef.current.scale = 1;
      isReadyRef.current = true;
      applyCurrentValues(true);

      if (isNodeClickedRef.current) {
        updateHoverState('full');
      }
      return;
    }

    gsap.set(mainGroupRef.current, { scaleX: 0, scaleY: 0, opacity: 0 });
    gsap.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
    gsap.set(imageRef.current, { opacity: 0 });
    gsap.set(iconRef.current, { opacity: 0, scaleX: ICON_SCALE, scaleY: ICON_SCALE }); 
    if (captionRef.current) gsap.set(captionRef.current, { opacity: 0, y: size + 10 });

    const tl = gsap.timeline({ delay });
    tl.to(mainGroupRef.current, { 
      opacity: 1, 
      scaleX: 1, 
      scaleY: 1, 
      duration: 2.5, 
      ease: "power2.out", 
      delay: 0.8, 
      onComplete: () => { 
        isReadyRef.current = true; 
        if (isNodeClickedRef.current) {
          updateHoverState('full');
        } else {
          // 생성 애니메이션 종료 후 최종 수치를 강제 동기화하여 완벽한 모양으로 고정
          applyCurrentValues(true);
        }
      } 
    });
    tl.to(iconRef.current, { opacity: 0.35, duration: 1.2, ease: "power2.inOut" }, 2.0);
    tl.to(mainProgressRef.current, { 
      scale: 1, 
      duration: 2.5, 
      ease: "power2.out",
      onUpdate: updateGradient // 생성 진행 과정에 맞춰 잉크가 부드럽게 번지도록 업데이트 호출
    }, 0.8);
    
    return () => { tl.kill(); };
  }, [size, delay, ICON_SCALE, updateHoverState, updateGradient, applyCurrentValues, isRestored]);

  const onEnterProximate = useCallback(() => { isMouseOverRef.current = true; updateHoverState('proximate'); }, [updateHoverState]);
  const onLeaveProximate = useCallback(() => { isMouseOverRef.current = false; updateHoverState('none'); }, [updateHoverState]);
  const onEnterFull = useCallback(() => { isMouseOverRef.current = true; updateHoverState('full'); }, [updateHoverState]);
  const onLeaveFull = useCallback(() => { isMouseOverRef.current = false; updateHoverState('proximate'); }, [updateHoverState]);

  return {
    refs: { mainGroupRef, inkSpreadRef, imageRef, captionRef, iconRef, filterLayerRef },
    handlers: { onEnterProximate, onLeaveProximate, onEnterFull, onLeaveFull },
    isReadyRef, ICON_SCALE, rgb
  };
};