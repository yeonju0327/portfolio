import React, { useRef, useState, useEffect } from 'react';

interface CustomScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  thumbColor?: string;
  thumbHoverColor?: string;
}

export const CustomScrollContainer: React.FC<CustomScrollContainerProps> = ({
  children,
  className,
  style,
  contentClassName,
  contentStyle,
  thumbColor = 'rgba(255, 255, 255, 0.25)',
  thumbHoverColor = 'rgba(255, 255, 255, 0.45)',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const updateScrollbar = () => {
    if (!containerRef.current) return;
    const { clientHeight, scrollHeight, scrollTop } = containerRef.current;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      return;
    }
    const computedThumbHeight = Math.max(30, (clientHeight / scrollHeight) * clientHeight);
    const computedThumbTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - computedThumbHeight);
    setThumbHeight(computedThumbHeight);
    setThumbTop(computedThumbTop);
  };

  useEffect(() => {
    updateScrollbar();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScrollbar);
      if (containerRef.current) observer.observe(containerRef.current);
      // Observe child content changes too
      if (containerRef.current?.firstElementChild) {
        observer.observe(containerRef.current.firstElementChild as Element);
      }
      return () => observer.disconnect();
    }
  }, [children]);

  const handleScroll = () => {
    updateScrollbar();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    if (containerRef.current) {
      startScrollTop.current = containerRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientHeight, scrollHeight } = containerRef.current;
      const deltaY = e.clientY - startY.current;
      const scrollableHeight = scrollHeight - clientHeight;
      const trackHeight = clientHeight - thumbHeight;
      if (trackHeight <= 0) return;
      
      const ratio = deltaY / trackHeight;
      containerRef.current.scrollTop = startScrollTop.current + ratio * scrollableHeight;
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  return (
    <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', ...style }} className={className}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          ...contentStyle,
        }}
        className={`hide-scrollbar ${contentClassName || ''}`}
      >
        {/* ✨ .hide-scrollbar 스타일은 globals.css로 이전됨 (중복 style 태그 제거) */}
        {children}
      </div>
      {thumbHeight > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            width: '6px',
            background: 'transparent',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              top: `${thumbTop}px`,
              right: 0,
              width: '6px',
              height: `${thumbHeight}px`,
              backgroundColor: isDragging ? thumbHoverColor : thumbColor,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                (e.currentTarget as HTMLElement).style.backgroundColor = thumbHoverColor;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                (e.currentTarget as HTMLElement).style.backgroundColor = thumbColor;
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
