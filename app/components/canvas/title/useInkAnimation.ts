import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import Konva from "konva";

export const useInkAnimation = (id: string, color: string, size: number, delay: number, isDraggingActive?: boolean, isSelected?: boolean) => {
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
  
  // ✨ [절대 수정 금지] 선택된 노드의 상태를 보호하기 위한 Ref
  const isNodeClickedRef = useRef(false);
  
  const hoverState = useRef<'none' | 'proximate' | 'full'>('none');
  const isMouseOverRef = useRef(false);

  const HOVER_INNER_RADIUS = size - 15;
  const ICON_SCALE = (size / 85) * 1.8;
  const rgb = Konva.Util.getRGB(color) || { r: 0, g: 0, b: 0 };

  const updateGradient = useCallback(() => {
    // ✨ [절대 수정 금지] 카메라 이동(moveCamera) 중 gsap.killTweensOf()가 호출되어 애니메이션이 끊기더라도,
    // isSelected 상태라면 강제로 필터 스케일을 0으로, 이너 반경을 최대로 밀어넣어 테두리 증발(Evaporate) 버그를 원천 차단합니다.
    if (isNodeClickedRef.current) {
      hoverProxy.current.filterScale = 0;
      hoverProxy.current.inner = HOVER_INNER_RADIUS;
    }

    inkSpreadRef.current?.innerRadius(hoverProxy.current.inner);
    const filterMap = document.getElementById(`disp-${id}`);
    if (filterMap) filterMap.setAttribute("scale", hoverProxy.current.filterScale.toString());

    const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS;
    const smoothProgress = gsap.parseEase("power1.out")(progress);
    const stopPoint = 0.85 + (0.13 * smoothProgress);
    const fadeWidth = 1 - stopPoint;
    const mainAlpha = mainProgressRef.current.scale;

    inkSpreadRef.current?.fillRadialGradientColorStops([
      0, color, stopPoint, color,
      stopPoint + fadeWidth * 0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.6 * mainAlpha})`,
      stopPoint + fadeWidth * 0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.2 * mainAlpha})`,
      stopPoint + fadeWidth * 0.9, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.02 * mainAlpha})`,
      1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`,
    ]);
  }, [id, color, rgb.r, rgb.g, rgb.b, HOVER_INNER_RADIUS]);

  const updateHoverState = useCallback((newState: 'none' | 'proximate' | 'full') => {
    if (isDraggingRef.current || !isReadyRef.current) return;
    
    // ✨ [절대 수정 금지] 이미 클릭되어 포커스된 노드는 마우스가 영역을 벗어나도(카메라 이동 등) 상태 강등을 허용하지 않음
    if (isNodeClickedRef.current && newState !== 'full') return; 
    
    if (hoverState.current === newState) return;
    
    hoverState.current = newState;
    gsap.killTweensOf([mainGroupRef.current, imageRef.current, captionRef.current, iconRef.current]);
    if (filterTweenRef.current) filterTweenRef.current.kill();

    if (newState === 'full') {
      document.body.style.cursor = "pointer";
      
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
      document.body.style.cursor = "default";

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
      document.body.style.cursor = "default";

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

  useEffect(() => {
    isNodeClickedRef.current = isSelected ?? false;
    
    if (isSelected) {
      updateHoverState('full');
      // ✨ [절대 수정 금지] 선택된 노드는 카메라 이동 시 GSAP Ticker를 통해 매 프레임 강제로 updateGradient 호출을 보장
      gsap.ticker.add(updateGradient); 
    } else {
      updateHoverState(isMouseOverRef.current ? 'full' : 'none');
      gsap.ticker.remove(updateGradient);
    }
    
    return () => { gsap.ticker.remove(updateGradient); };
  }, [isSelected, updateHoverState, updateGradient]);

  useEffect(() => {
    isDraggingRef.current = isDraggingActive;
    if (isDraggingActive && hoverState.current !== 'none') updateHoverState('none');
  }, [isDraggingActive, updateHoverState]);

  useEffect(() => {
    gsap.set(mainGroupRef.current, { scaleX: 0, scaleY: 0, opacity: 0 });
    gsap.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
    gsap.set(imageRef.current, { opacity: 0 });
    gsap.set(iconRef.current, { opacity: 0, scaleX: ICON_SCALE, scaleY: ICON_SCALE }); 
    if (captionRef.current) gsap.set(captionRef.current, { opacity: 0, y: size + 10 });

    const tl = gsap.timeline({ delay });
    tl.to(mainGroupRef.current, { opacity: 1, scaleX: 1, scaleY: 1, duration: 2.5, ease: "power2.out", delay: 0.8, onComplete: () => { isReadyRef.current = true; } });
    tl.to(iconRef.current, { opacity: 0.35, duration: 1.2, ease: "power2.inOut" }, 2.0);
    tl.to(mainProgressRef.current, { scale: 1, duration: 2.5, ease: "power2.out" }, 0.8);
    
    return () => { tl.kill(); };
  }, [size, delay, ICON_SCALE]);

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