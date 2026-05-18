import React, { useMemo, useRef } from "react";
import { Stage, Layer, Group, Ring, Image as KonvaImage, Text, Path } from "react-konva";
import useImage from "use-image";
import { NodeProps } from "./types";
import { useInkAnimation } from "./useInkAnimation"; 
import { getIconPath } from "./data"; 

interface ExtendedProps extends NodeProps {
  icon?: string;
  caption?: string;
  stageSize: number;
  onNodeClick?: (id: string) => void;
  isDraggingActive?: boolean;
  isAutoExploring?: boolean; // ✨ 상호작용 잠금 플래그 수신
  isSelected?: boolean;
}

const InkSpread: React.FC<ExtendedProps> = React.memo(
  ({ id, x, y, color = "#000000", size = 85, stageSize, img = "/images/node-image.jpg", delay = 0, icon = "plus", caption, onNodeClick, isDraggingActive, isAutoExploring, isSelected }) => {
    
    // ✨ 드래그 중이거나 자동 탐색 중일 때는 모든 상호작용 차단 및 Hover 애니메이션 무시
    const disableInteraction = isDraggingActive || isAutoExploring;
    
    const { refs, handlers, isReadyRef, ICON_SCALE, rgb } = useInkAnimation(id, color, size, delay, disableInteraction, isSelected);
    const [image] = useImage(img);

    const CLIP_RADIUS = size - 5;
    const IMG_SIZE = CLIP_RADIUS * 2;
    const iconPathData = useMemo(() => getIconPath(icon), [icon]);

    // ✨ 마우스 이탈 계산을 위한 Hitbox 레퍼런스
    const proximateRef = useRef<HTMLDivElement>(null);
    const fullRef = useRef<HTMLDivElement>(null);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        
        {/* 히트박스 1 (주변) */}
        <div 
          ref={proximateRef}
          style={{
            position: 'absolute', top: '50%', left: '50%', width: size * 3.2, height: size * 3.2,
            transform: 'translate(-50%, -50%)', borderRadius: '50%', zIndex: 10, 
            pointerEvents: disableInteraction ? 'none' : 'auto', cursor: 'default'
          }}
          onMouseEnter={handlers.onEnterProximate}
          onMouseLeave={(e) => {
            // ✨ 버그 수정: 마우스가 안쪽 중앙 영역(Full)으로 진입해서 발생한 이벤트라면 무시 (깜빡임 방지)
            if (e.nativeEvent.relatedTarget !== fullRef.current) {
              handlers.onLeaveProximate();
            }
          }}
        />

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none' }}>
          
          <div ref={refs.filterLayerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: `url(#ink-bleed-${id})`, pointerEvents: 'none' }}>
            <Stage width={stageSize} height={stageSize}><Layer listening={false}>
              <Group x={x} y={y}>
                <Group ref={refs.mainGroupRef} scaleX={0} scaleY={0} opacity={0} listening={false}>
                  <Group clipFunc={(ctx) => ctx.arc(0, 0, CLIP_RADIUS, 0, Math.PI * 2)} listening={false}>
                    <KonvaImage ref={refs.imageRef} image={image} x={0} y={0} width={IMG_SIZE} height={IMG_SIZE} offsetX={CLIP_RADIUS} offsetY={CLIP_RADIUS} opacity={0} listening={false} />
                  </Group>
                  <Ring ref={refs.inkSpreadRef} x={0} y={0} innerRadius={0} outerRadius={size} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientEndRadius={size} fillRadialGradientColorStops={[ 0, color, 0.85, color, 1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)` ]} listening={false} />
                </Group>
              </Group>
            </Layer></Stage>
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'url(#crayon-texture)', pointerEvents: 'none' }}>
            <Stage width={stageSize} height={stageSize}><Layer listening={false}>
              <Group x={x} y={y}>
                <Group ref={refs.iconRef} x={0} y={0} opacity={0} scaleX={ICON_SCALE} scaleY={ICON_SCALE} listening={false}>
                  <Path data={iconPathData} stroke="rgba(255, 255, 255, 0.9)" strokeWidth={3} lineCap="round" lineJoin="round" />
                </Group>
              </Group>
            </Layer></Stage>
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <Stage width={stageSize} height={stageSize}><Layer>
              <Group x={x} y={y}>
                {caption && ( <Text ref={refs.captionRef} text={caption} x={0} y={size + 10} offsetX={100} width={200} align="center" fill="#333333" fontSize={16} fontStyle="bold" fontFamily="'Noto Sans KR', sans-serif" opacity={0} listening={false} /> )}
              </Group>
            </Layer></Stage>
          </div>

        </div>

        {/* 히트박스 2 (클릭) */}
        <div 
          ref={fullRef}
          style={{
            position: 'absolute', top: '50%', left: '50%', width: (size + 15) * 2, height: (size + 15) * 2,
            transform: 'translate(-50%, -50%)', borderRadius: '50%', zIndex: 30,
            pointerEvents: disableInteraction ? 'none' : 'auto', cursor: 'pointer'
          }}
          onMouseEnter={handlers.onEnterFull}
          onMouseLeave={(e) => {
            // ✨ 버그 수정: 마우스가 매우 빠르게 화면 밖으로 나갈 때 인식 오류 차단
            if (e.nativeEvent.relatedTarget === proximateRef.current) {
              handlers.onLeaveFull(); // 속도를 줄여 주변 영역(Proximate)을 거쳐서 나가는 경우
            } else {
              handlers.onLeaveProximate(); // 완전히 허공(Canvas)으로 건너뛰어 나간 경우 강제 초기화
            }
          }}
          onClick={() => !disableInteraction && isReadyRef.current && onNodeClick?.(id)}
        />

      </div>
    );
  },
);

InkSpread.displayName = "InkSpread";
export default InkSpread;