import React, { useEffect, useRef, useCallback } from "react";
import { Group, Circle, Ring, Image as KonvaImage } from "react-konva";
import { gsap } from "gsap";
import useImage from "use-image";
import Konva from "konva";
import { NodeProps } from "./types";

interface ExtendedProps extends NodeProps {
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
    img = "/images/node-image.jpg",
    delay = 0,
    onNodeClick,
    isDraggingActive,
  }) => {
    const mainGroupRef = useRef<import("konva/lib/Group").Group>(null);
    const inkSpreadRef = useRef<import("konva/lib/shapes/Ring").Ring>(null);
    const imageRef = useRef<import("konva/lib/shapes/Image").Image>(null);

    const filterTweenRef = useRef<gsap.core.Tween | null>(null);
    const mainProgressRef = useRef({ scale: 0 });
    const hoverProxy = useRef({ inner: 0, filterScale: 20 });

    const isReadyRef = useRef(false);
    const isMouseOverRef = useRef(false);
    const isDraggingRef = useRef(isDraggingActive);

    const [image] = useImage(img);

    const HOVER_INNER_RADIUS = size - 15;
    const CLIP_RADIUS = size - 5;
    const IMG_SIZE = CLIP_RADIUS * 2;

    const rgb = Konva.Util.getRGB(color) || { r: 0, g: 0, b: 0 };
    const { r, g, b } = rgb;

    const updateGradient = useCallback(() => {
      inkSpreadRef.current?.innerRadius(hoverProxy.current.inner);
      const filterMap = document.getElementById(`disp-${id}`);
      if (filterMap)
        filterMap.setAttribute(
          "scale",
          hoverProxy.current.filterScale.toString(),
        );

      const progress = hoverProxy.current.inner / HOVER_INNER_RADIUS;
      const smoothProgress = gsap.parseEase("power1.out")(progress);
      const solidStop = 0.75 + 0.24 * smoothProgress;
      const fadeWidth = 1 - solidStop;
      const mainAlpha = mainProgressRef.current.scale;

      inkSpreadRef.current?.fillRadialGradientColorStops([
        0,
        color,
        solidStop,
        color,
        solidStop + fadeWidth * 0.3,
        `rgba(${r},${g},${b},${0.6 * mainAlpha})`,
        solidStop + fadeWidth * 0.6,
        `rgba(${r},${g},${b},${0.2 * mainAlpha})`,
        solidStop + fadeWidth * 0.9,
        `rgba(${r},${g},${b},${0.02 * mainAlpha})`,
        1,
        `rgba(${r},${g},${b},0)`,
      ]);
    }, [id, color, r, g, b, HOVER_INNER_RADIUS]);

    const playHoverIn = useCallback(() => {
      if (!isDraggingRef.current) document.body.style.cursor = "pointer";
      gsap.killTweensOf([mainGroupRef.current, imageRef.current]);
      if (filterTweenRef.current) filterTweenRef.current.kill();

      gsap.to(mainGroupRef.current, {
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 0.25,
        ease: "power2.out",
      });
      gsap.to(imageRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });

      filterTweenRef.current = gsap.to(hoverProxy.current, {
        inner: HOVER_INNER_RADIUS,
        filterScale: 0,
        duration: 0.25,
        ease: "power2.out",
        onUpdate: updateGradient,
      });
    }, [updateGradient, HOVER_INNER_RADIUS]);

    const playHoverOut = useCallback(() => {
      if (!isDraggingRef.current) document.body.style.cursor = "default";
      gsap.killTweensOf([mainGroupRef.current, imageRef.current]);
      if (filterTweenRef.current) filterTweenRef.current.kill();

      gsap.to(mainGroupRef.current, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(imageRef.current, {
        opacity: 0,
        duration: 0.35,
        ease: "power3.out",
      });

      filterTweenRef.current = gsap.to(hoverProxy.current, {
        inner: 0,
        filterScale: 20,
        duration: 0.35,
        ease: "power3.out",
        onUpdate: updateGradient,
      });
    }, [updateGradient]);

    useEffect(() => {
      isDraggingRef.current = isDraggingActive;
      if (isDraggingActive && isMouseOverRef.current) playHoverOut();
      else if (
        !isDraggingActive &&
        isMouseOverRef.current &&
        isReadyRef.current
      )
        playHoverIn();
    }, [isDraggingActive, playHoverIn, playHoverOut]);

    useEffect(() => {
      const tl = gsap.timeline({ delay });
      tl.set(mainGroupRef.current, { scaleX: 0, scaleY: 0, opacity: 0 });
      tl.set(inkSpreadRef.current, { innerRadius: 0, outerRadius: size });
      tl.set(imageRef.current, { opacity: 0 });

      tl.to(mainGroupRef.current, {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 2.5,
        ease: "power2.out",
        delay: 0.8,
        onComplete: () => {
          isReadyRef.current = true;
          if (isMouseOverRef.current && !isDraggingRef.current) playHoverIn();
        },
      });

      tl.to(
        mainProgressRef.current,
        { scale: 1, duration: 2.5, ease: "power2.out" },
        delay + 0.8,
      );
      return () => {
        tl.kill();
      };
    }, [size, delay, playHoverIn]);

    return (
      <Group x={x} y={y}>
        <Group
          ref={mainGroupRef}
          scaleX={0}
          scaleY={0}
          opacity={0}
          listening={false}
        >
          <Group
            clipFunc={(ctx) => ctx.arc(0, 0, CLIP_RADIUS, 0, Math.PI * 2)}
            listening={false}
          >
            <KonvaImage
              ref={imageRef}
              image={image}
              x={0}
              y={0}
              width={IMG_SIZE}
              height={IMG_SIZE}
              offsetX={CLIP_RADIUS}
              offsetY={CLIP_RADIUS}
              opacity={0}
              listening={false}
            />
          </Group>
          <Ring
            ref={inkSpreadRef}
            x={0}
            y={0}
            innerRadius={0}
            outerRadius={size}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={size}
            fillRadialGradientColorStops={[
              0,
              color,
              0.75,
              color,
              1,
              `rgba(${r},${g},${b},0)`,
            ]}
            listening={false}
          />
        </Group>
        <Circle
          x={0}
          y={0}
          radius={size + 35}
          fill="rgba(0,0,0,0)"
          onMouseEnter={() => {
            isMouseOverRef.current = true;
            if (isReadyRef.current && !isDraggingRef.current) playHoverIn();
          }}
          onMouseLeave={() => {
            isMouseOverRef.current = false;
            if (isReadyRef.current) playHoverOut();
          }}
          onClick={() =>
            !isDraggingActive && isReadyRef.current && onNodeClick?.(id)
          }
        />
      </Group>
    );
  },
);
InkSpread.displayName = "InkSpread";
export default InkSpread;
