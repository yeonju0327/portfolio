import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Group, Circle, Ring, Image as KonvaImage, Text, Path } from "react-konva";
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
}

const InkSpread: React.FC<ExtendedProps> = React.memo(
  ({
    id,
    x,
    y,
    color = "#000000",
    size = 85,
    stageSize,
    img = "/images/node-image.jpg",
    delay = 0,
    icon = "plus",
    caption,
    onNodeClick,
    isDraggingActive,
  }) => {
    const mainGroupRef = useRef<import("konva/lib/Group").Group>(null);
    const inkSpreadRef = useRef<import("konva/lib/shapes/Ring").Ring>(null);
    const imageRef = useRef<import("konva/lib/shapes/Image").Image>(null);
    const captionRef = useRef<import("konva/lib/shapes/Text").Text>(null);
    const iconRef = useRef<import("konva/lib/Group").Group>(null);

    const filterTweenRef = useRef<gsap.core.Tween | null>(null);
    const mainProgressRef = useRef({ scale: 0 });
    const hoverProxy = useRef({ inner: 0, filterScale: 20 });

    const isReadyRef = useRef(false);
    const isDraggingRef = useRef(isDraggingActive);
    const hoverState = useRef<'none' | 'proximate' | 'full'>('none');

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
      
      // ✨ 해결: 고정값 0.75 대신 동적인 solidStop을 그라데이션 정지점에 정확히 매핑
      const solidStop = 0.75 + 0.24 * smoothProgress;
      const fadeWidth = 1 - solidStop;
      const mainAlpha = mainProgressRef.current.scale;

      inkSpreadRef.current?.fillRadialGradientColorStops([
        0, color,
        solidStop, color, // 테두리 농도를 유지하기 위해 solidStop 지점까지 색상을 꽉 채움
        solidStop + fadeWidth * 0.3, `rgba(${r},${g},${b},${0.6 * mainAlpha})`,
        solidStop + fadeWidth * 0.6, `rgba(${r},${g},${b},${0.2 * mainAlpha})`,
        solidStop + fadeWidth * 0.9, `rgba(${r},${g},${b},${0.02 * mainAlpha})`,
        1, `rgba(${r},${g},${b},0)`,
      ]);
    }, [id, color, r, g, b, HOVER_INNER_RADIUS]);

    const updateHoverState = useCallback((newState: 'none' | 'proximate' | 'full') => {
      if (isDraggingRef.current || !isReadyRef.current) return;
      if (hoverState.current === newState) return;
      
      hoverState.current = newState;
      
      gsap.killTweensOf([mainGroupRef.current, imageRef.current, captionRef.current, iconRef.current]);
      if (filterTweenRef.current) filterTweenRef.current.kill();

      if (newState === 'full') {
        document.body.style.cursor = "pointer";
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
    }, [updateGradient, HOVER_INNER_RADIUS, size]);

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

      tl.to(mainGroupRef.current, {
        opacity: 1, scaleX: 1, scaleY: 1, duration: 2.5, ease: "power2.out", delay: 0.8,
        onComplete: () => { isReadyRef.current = true; },
      });

      // 아이콘 등장 타이밍: 노드가 충분히 퍼진 후(2.6s)
      tl.to(iconRef.current, { opacity: 0.35, duration: 1.2, ease: "power2.inOut" }, delay + 2.6);
      
      tl.to(mainProgressRef.current, { scale: 1, duration: 2.5, ease: "power2.out" }, delay + 0.8);
      
      return () => { tl.kill(); };
    }, [size, delay]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        
        {/* LAYER 1: 강한 잉크 번짐 필터가 적용되는 하단 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: `url(#ink-bleed-${id})`, pointerEvents: 'none' }}>
          <Stage width={stageSize} height={stageSize}>
            <Layer>
              <Group x={x} y={y}>
                <Group ref={mainGroupRef} scaleX={0} scaleY={0} opacity={0} listening={false}>
                  <Group clipFunc={(ctx) => ctx.arc(0, 0, CLIP_RADIUS, 0, Math.PI * 2)} listening={false}>
                    <KonvaImage ref={imageRef} image={image} x={0} y={0} width={IMG_SIZE} height={IMG_SIZE} offsetX={CLIP_RADIUS} offsetY={CLIP_RADIUS} opacity={0} listening={false} />
                  </Group>
                  <Ring ref={inkSpreadRef} x={0} y={0} innerRadius={0} outerRadius={size} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientEndRadius={size} fillRadialGradientColorStops={[ 0, color, 0.75, color, 1, `rgba(${r},${g},${b},0)` ]} listening={false} />
                </Group>
              </Group>
            </Layer>
          </Stage>
        </div>

        {/* LAYER 2: 플레이스홀더와 동일한 텍스처 필터(#crayon-texture)가 입혀진 아이콘 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'url(#crayon-texture)', pointerEvents: 'none' }}>
          <Stage width={stageSize} height={stageSize}>
            <Layer>
              <Group x={x} y={y}>
                <Group ref={iconRef} x={0} y={0} listening={false}>
                  <Path data={iconPathData} stroke="rgba(255, 255, 255, 0.9)" strokeWidth={3} lineCap="round" lineJoin="round" />
                </Group>
              </Group>
            </Layer>
          </Stage>
        </div>

        {/* LAYER 3: 필터 없이 깨끗하게 렌더링되는 텍스트 및 클릭/호버 감지 영역 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <Stage width={stageSize} height={stageSize}>
            <Layer>
              <Group x={x} y={y}>
                {/* 호버 캡션 */}
                {caption && (
                  <Text ref={captionRef} text={caption} x={0} y={size + 10} offsetX={100} width={200} align="center" fill="#333333" fontSize={16} fontStyle="bold" fontFamily="'Noto Sans KR', sans-serif" opacity={0} listening={false} />
                )}

                {/* 넓은 인식 영역 (Proximity) */}
                <Circle x={0} y={0} radius={size * 2.2} fill="rgba(0,0,0,0)" onMouseEnter={() => updateHoverState('proximate')} onMouseLeave={() => updateHoverState('none')} />

                {/* 좁은 인식 영역 (Full Hover) */}
                <Circle x={0} y={0} radius={size + 15} fill="rgba(0,0,0,0)" onMouseEnter={() => updateHoverState('full')} onMouseLeave={() => updateHoverState('proximate')} onClick={() => !isDraggingActive && isReadyRef.current && onNodeClick?.(id)} />
              </Group>
            </Layer>
          </Stage>
        </div>

      </div>
    );
  },
);

InkSpread.displayName = "InkSpread";
export default InkSpread;