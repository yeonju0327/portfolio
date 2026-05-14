import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Group, Ring, Image as KonvaImage, Text, Path } from "react-konva";
import { gsap } from "gsap";
import useImage from "use-image";
import Konva from "konva";
import { NodeProps } from "./types";

interface ExtendedProps extends NodeProps {
  icon?: string;
  caption?: string;
  stageSize: number;
  onNodeClick?: (id: string) => void;
  isDraggingActive?: boolean;
  isSelected?: boolean;
}

const InkSpread: React.FC<ExtendedProps> = React.memo(
  ({
    id, x, y, color = "#000000", size = 85, stageSize, img = "/images/node-image.jpg",
    delay = 0, icon = "plus", caption, onNodeClick, isDraggingActive, isSelected,
  }) => {
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

    const [image] = useImage(img);

    const HOVER_INNER_RADIUS = size - 15;
    const CLIP_RADIUS = size - 5;
    const IMG_SIZE = CLIP_RADIUS * 2;

    const rgb = Konva.Util.getRGB(color) || { r: 0, g: 0, b: 0 };
    const { r, g, b } = rgb;

    const iconPathData = useMemo(() => {
      switch (icon) {
        case 'about': return 'M -7 -6 A 7 7 0 1 1 7 -6 A 7 7 0 1 1 -7 -6 M -13 14 C -13 2 13 2 13 14';
        case 'project': return 'M -14 -10 L 14 -10 L 14 6 L -14 6 Z M -5 6 L -7 14 L 7 14 L 5 6';
        case 'skill': return 'M 0 -13 L 3 -4 L 13 -4 L 5 2 L 8 12 L 0 6 L -8 12 L -5 2 L -13 -4 L -3 -4 Z';
        case 'plus': default: return 'M -12 0 L 12 0 M 0 -12 L 0 12';
      }
    }, [icon]);

    const updateGradient = useCallback(() => {
      inkSpreadRef.current?.innerRadius(hoverProxy.current.inner);
      
      const filterMap = document.getElementById(`disp-${id}`);
      if (filterMap) {
        filterMap.setAttribute("scale", hoverProxy.current.filterScale.toString());
      }

      const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS;
      const smoothProgress = gsap.parseEase("power1.out")(progress);
      
      const stopPoint = 0.85 + (0.13 * smoothProgress);
      const fadeWidth = 1 - stopPoint;
      const mainAlpha = mainProgressRef.current.scale;

      inkSpreadRef.current?.fillRadialGradientColorStops([
        0, color,
        stopPoint, color,
        stopPoint + fadeWidth * 0.3, `rgba(${r},${g},${b},${0.6 * mainAlpha})`,
        stopPoint + fadeWidth * 0.6, `rgba(${r},${g},${b},${0.2 * mainAlpha})`,
        stopPoint + fadeWidth * 0.9, `rgba(${r},${g},${b},${0.02 * mainAlpha})`,
        1, `rgba(${r},${g},${b},0)`,
      ]);
    }, [id, color, r, g, b, HOVER_INNER_RADIUS]);

    const updateHoverState = useCallback((newState: 'none' | 'proximate' | 'full') => {
      if (isDraggingRef.current || !isReadyRef.current) return;
      if (isNodeClickedRef.current && newState !== 'full') return; 
      if (hoverState.current === newState) return;
      
      hoverState.current = newState;
      
      gsap.killTweensOf([mainGroupRef.current, imageRef.current, captionRef.current, iconRef.current]);
      if (filterTweenRef.current) filterTweenRef.current.kill();

      if (newState === 'full') {
        document.body.style.cursor = "pointer";
        
        if (filterLayerRef.current) filterLayerRef.current.style.filter = 'none';

        gsap.to(mainGroupRef.current, { scaleX: 1.15, scaleY: 1.15, duration: 0.25, ease: "power2.out" });
        gsap.to(imageRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" });
        gsap.to(iconRef.current, { opacity: 0, duration: 0.25, ease: "power2.out" });
        
        if (captionRef.current) {
          gsap.to(captionRef.current, { opacity: 1, y: size + 25, duration: 0.25, ease: "power2.out" });
        }
        
        filterTweenRef.current = gsap.to(hoverProxy.current, {
          inner: HOVER_INNER_RADIUS, filterScale: 0, duration: 0.25, ease: "power2.out", onUpdate: updateGradient,
        });

      } else if (newState === 'proximate') {
        document.body.style.cursor = "default";
        
        if (filterLayerRef.current) filterLayerRef.current.style.filter = `url(#ink-bleed-${id})`;

        gsap.to(mainGroupRef.current, { scaleX: 1.05, scaleY: 1.05, duration: 0.4, ease: "power2.out" });
        gsap.to(imageRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
        gsap.to(iconRef.current, { opacity: 0.8, duration: 0.4, ease: "power2.out" });
        
        if (captionRef.current) {
          gsap.to(captionRef.current, { opacity: 0, y: size + 10, duration: 0.3, ease: "power2.out" }); 
        }
        
        filterTweenRef.current = gsap.to(hoverProxy.current, {
          inner: 0, filterScale: 15, duration: 0.4, ease: "power2.out", onUpdate: updateGradient,
        });

      } else {
        document.body.style.cursor = "default";
        
        if (filterLayerRef.current) filterLayerRef.current.style.filter = `url(#ink-bleed-${id})`;

        gsap.to(mainGroupRef.current, { scaleX: 1, scaleY: 1, duration: 0.35, ease: "power3.out" });
        gsap.to(imageRef.current, { opacity: 0, duration: 0.35, ease: "power3.out" });
        gsap.to(iconRef.current, { opacity: 0.35, duration: 0.35, ease: "power3.out" });
        
        if (captionRef.current) {
          gsap.to(captionRef.current, { opacity: 0, y: size + 10, duration: 0.35, ease: "power3.out" });
        }
        
        filterTweenRef.current = gsap.to(hoverProxy.current, {
          inner: 0, filterScale: 20, duration: 0.35, ease: "power3.out", onUpdate: updateGradient,
        });
      }
    }, [updateGradient, HOVER_INNER_RADIUS, size, id]);

    useEffect(() => {
      isNodeClickedRef.current = isSelected ?? false;
      if (isSelected) {
        updateHoverState('full');
        gsap.ticker.add(updateGradient); 
      } else {
        updateHoverState(isMouseOverRef.current ? 'full' : 'none');
        gsap.ticker.remove(updateGradient);
      }
      return () => { gsap.ticker.remove(updateGradient); };
    }, [isSelected, updateHoverState, updateGradient]);

    useEffect(() => {
      isDraggingRef.current = isDraggingActive;
      if (isDraggingActive && hoverState.current !== 'none') {
        updateHoverState('none');
      }
    }, [isDraggingActive, updateHoverState]);

    useEffect(() => {
      const tl = gsap.timeline({ delay });
      tl.set(mainGroupRef.current, { scaleX: 0, scaleY: 0, opacity: 0 });
      tl.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
      tl.set(imageRef.current, { opacity: 0 });
      tl.set(iconRef.current, { opacity: 0, scaleX: 1.8, scaleY: 1.8 }); 
      if (captionRef.current) tl.set(captionRef.current, { opacity: 0, y: size + 10 });

      tl.to(mainGroupRef.current, { opacity: 1, scaleX: 1, scaleY: 1, duration: 2.5, ease: "power2.out", delay: 0.8, onComplete: () => { isReadyRef.current = true; } });
      tl.to(iconRef.current, { opacity: 0.35, duration: 1.2, ease: "power2.inOut" }, delay + 2.6);
      tl.to(mainProgressRef.current, { scale: 1, duration: 2.5, ease: "power2.out" }, delay + 0.8);
      
      return () => { tl.kill(); };
    }, [size, delay]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={filterLayerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: `url(#ink-bleed-${id})`, pointerEvents: 'none' }}>
          <Stage width={stageSize} height={stageSize}><Layer listening={false}>
            <Group x={x} y={y}>
              <Group ref={mainGroupRef} scaleX={0} scaleY={0} opacity={0} listening={false}>
                <Group clipFunc={(ctx) => ctx.arc(0, 0, CLIP_RADIUS, 0, Math.PI * 2)} listening={false}>
                  <KonvaImage ref={imageRef} image={image} x={0} y={0} width={IMG_SIZE} height={IMG_SIZE} offsetX={CLIP_RADIUS} offsetY={CLIP_RADIUS} opacity={0} listening={false} />
                </Group>
                <Ring ref={inkSpreadRef} x={0} y={0} innerRadius={0} outerRadius={size} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientEndRadius={size} fillRadialGradientColorStops={[ 0, color, 0.85, color, 1, `rgba(${r},${g},${b},0)` ]} listening={false} />
              </Group>
            </Group>
          </Layer></Stage>
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'url(#crayon-texture)', pointerEvents: 'none' }}>
          <Stage width={stageSize} height={stageSize}><Layer listening={false}>
            <Group x={x} y={y}>
              <Group ref={iconRef} x={0} y={0} listening={false}>
                <Path data={iconPathData} stroke="rgba(255, 255, 255, 0.9)" strokeWidth={3} lineCap="round" lineJoin="round" />
              </Group>
            </Group>
          </Layer></Stage>
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <Stage width={stageSize} height={stageSize}><Layer listening={false}>
            <Group x={x} y={y}>
              {caption && (
                <Text ref={captionRef} text={caption} x={0} y={size + 10} offsetX={100} width={200} align="center" fill="#333333" fontSize={16} fontStyle="bold" fontFamily="'Noto Sans KR', sans-serif" opacity={0} listening={false} />
              )}
            </Group>
          </Layer></Stage>
        </div>

        {/* ✨ 버그 해결: 이벤트 유실 방지를 위한 부모-자식 중첩 (Nesting) 레이어 */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: size * 3.2, height: size * 3.2,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          zIndex: 30, // 캔버스 최상단에 이벤트 레이어 배치
          pointerEvents: isDraggingActive ? 'none' : 'auto',
          display: 'flex', justifyContent: 'center', alignItems: 'center' // 좁은 클릭 영역을 정중앙에 배치
        }}
        onMouseEnter={() => { isMouseOverRef.current = true; updateHoverState('proximate'); }}
        onMouseLeave={() => { isMouseOverRef.current = false; updateHoverState('none'); }} // 무조건 none 리셋
        >
          <div style={{
            width: (size + 15) * 2, height: (size + 15) * 2,
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          onMouseEnter={() => { updateHoverState('full'); }}
          onMouseLeave={() => { updateHoverState('proximate'); }}
          onClick={() => !isDraggingActive && isReadyRef.current && onNodeClick?.(id)}
          />
        </div>
      </div>
    );
  },
);

InkSpread.displayName = "InkSpread";
export default InkSpread;