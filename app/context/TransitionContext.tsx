'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PORTFOLIO_MAP } from '../components/canvas/title/data';

type TransitionType = 'in' | 'out' | 'in-detail' | null;

interface TransitionContextProps {
  isTransitioning: boolean;
  type: TransitionType;
  color: string;
  imgUrl: string;
  radius: number;
  imageRadius: number;
  centerPos: { x: number; y: number } | null;
  isBackTransition: boolean;
  startTransition: (targetUrl: string, screenX: number, screenY: number, radius: number, imageRadius: number, imgUrl: string, color: string) => void;
  startBackTransition: (color: string, imgUrl: string, callbackUrl?: string) => void;
  playInTransition: (screenX: number, screenY: number, radius: number, imageRadius: number, imgUrl: string, color: string) => void;
  playInDetailTransition: () => void;
  setTransitionState: (state: { isTransitioning: boolean; type: TransitionType; centerPos: { x: number; y: number } | null; radius: number; imageRadius: number; imgUrl: string; color: string; isBackTransition: boolean }) => void;
  resetTransition: () => void;
}

const TransitionContext = createContext<TransitionContextProps | undefined>(undefined);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [type, setType] = useState<TransitionType>(null);
  const [color, setColor] = useState('#2C2C2C');
  const [imgUrl, setImgUrl] = useState('');
  const [isBackTransition, setIsBackTransition] = useState(false);

  // 리렌더링에 필요한 상태 정의
  const [radius, setRadiusState] = useState(80);
  const [imageRadius, setImageRadiusState] = useState(75);
  const [centerPos, setCenterPosState] = useState<{ x: number; y: number } | null>(null);

  // useCallback 의존성 루프 파괴를 위한 refs 정의
  const centerPosRef = useRef(centerPos);
  const radiusRef = useRef(radius);
  const imageRadiusRef = useRef(imageRadius);

  // 상태값과 ref 값을 함께 변경해주는 안전한 래퍼 정의
  const setCenterPos = useCallback((val: { x: number; y: number } | null) => {
    centerPosRef.current = val;
    setCenterPosState(val);
  }, []);

  const setRadius = useCallback((val: number) => {
    radiusRef.current = val;
    setRadiusState(val);
  }, []);

  const setImageRadius = useCallback((val: number) => {
    imageRadiusRef.current = val;
    setImageRadiusState(val);
  }, []);

  const startTransition = useCallback((targetUrl: string, screenX: number, screenY: number, nodeRadius: number, nodeImageRadius: number, nodeImg: string, nodeColor: string) => {
    setIsTransitioning(true);
    setType('out');
    setCenterPos({ x: screenX, y: screenY });
    setRadius(nodeRadius);
    setImageRadius(nodeImageRadius);
    setImgUrl(nodeImg);
    setColor(nodeColor);
    setIsBackTransition(false);

    // Out-transition 애니메이션 완료(800ms) 후 실제 라우팅 수행
    setTimeout(() => {
      router.push(targetUrl);
    }, 850);
  }, [router, setCenterPos, setRadius, setImageRadius]);

  const startBackTransition = useCallback((nodeColor: string, nodeImg: string, callbackUrl: string = '/') => {
    setIsTransitioning(true);
    setType('out');
    setIsBackTransition(true);
    setColor(nodeColor);
    setImgUrl(nodeImg); 

    let finalCenter = centerPosRef.current;
    let finalRadius = radiusRef.current;
    let finalImageRadius = imageRadiusRef.current;

    if (!finalCenter && typeof window !== 'undefined') {
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      const savedViewport = sessionStorage.getItem('portfolio_viewport');
      if (savedFocused && PORTFOLIO_MAP[savedFocused] && savedViewport) {
        const node = PORTFOLIO_MAP[savedFocused];
        try {
          const vp = JSON.parse(savedViewport);
          const screenX = node.x * vp.scale + vp.x;
          const screenY = node.y * vp.scale + vp.y;
          const sizeVal = node.size ?? 85;
          const screenRadius = sizeVal * 1.15 * vp.scale;
          const screenImageRadius = (sizeVal - 5) * 1.15 * vp.scale;
          
          finalCenter = { x: screenX, y: screenY };
          finalRadius = screenRadius;
          finalImageRadius = screenImageRadius;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!finalCenter && typeof window !== 'undefined') {
      finalCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      finalRadius = 80;
      finalImageRadius = 75;
    }

    setCenterPos(finalCenter);
    setRadius(finalRadius);
    setImageRadius(finalImageRadius);

    setTimeout(() => {
      router.push(callbackUrl);
    }, 850);
  }, [router, setCenterPos, setRadius, setImageRadius]);

  const playInTransition = useCallback((screenX: number, screenY: number, nodeRadius: number, nodeImageRadius: number, nodeImg: string, nodeColor: string) => {
    setIsTransitioning(true);
    setType('in');
    setCenterPos({ x: screenX, y: screenY });
    setRadius(nodeRadius);
    setImageRadius(nodeImageRadius);
    setImgUrl(nodeImg);
    setColor(nodeColor);
    setIsBackTransition(true);
  }, [setCenterPos, setRadius, setImageRadius]);

  const playInDetailTransition = useCallback(() => {
    setIsTransitioning(true);
    setType('in-detail');
    setIsBackTransition(false);

    let finalCenter = centerPosRef.current;
    let finalRadius = radiusRef.current;
    let finalImageRadius = imageRadiusRef.current;

    if (!finalCenter && typeof window !== 'undefined') {
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      const savedViewport = sessionStorage.getItem('portfolio_viewport');
      if (savedFocused && PORTFOLIO_MAP[savedFocused] && savedViewport) {
        const node = PORTFOLIO_MAP[savedFocused];
        try {
          const vp = JSON.parse(savedViewport);
          const screenX = node.x * vp.scale + vp.x;
          const screenY = node.y * vp.scale + vp.y;
          const sizeVal = node.size ?? 85;
          const screenRadius = sizeVal * 1.15 * vp.scale;
          const screenImageRadius = (sizeVal - 5) * 1.15 * vp.scale;
          
          finalCenter = { x: screenX, y: screenY };
          finalRadius = screenRadius;
          finalImageRadius = screenImageRadius;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!finalCenter && typeof window !== 'undefined') {
      finalCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      finalRadius = 80;
      finalImageRadius = 75;
    }

    setCenterPos(finalCenter);
    setRadius(finalRadius);
    setImageRadius(finalImageRadius);
  }, [setCenterPos, setRadius, setImageRadius]);

  const setTransitionState = useCallback((state: { isTransitioning: boolean; type: TransitionType; centerPos: { x: number; y: number } | null; radius: number; imageRadius: number; imgUrl: string; color: string; isBackTransition: boolean }) => {
    setIsTransitioning(state.isTransitioning);
    setType(state.type);
    setCenterPos(state.centerPos);
    setRadius(state.radius);
    setImageRadius(state.imageRadius);
    setImgUrl(state.imgUrl);
    setColor(state.color);
    setIsBackTransition(state.isBackTransition);
  }, [setCenterPos, setRadius, setImageRadius]);

  const resetTransition = useCallback(() => {
    setIsTransitioning(false);
    setType(null);
    setCenterPos(null);
    setImgUrl('');
    setRadius(80);
    setImageRadius(75);
    setIsBackTransition(false);
  }, [setCenterPos, setRadius, setImageRadius]);

  return (
    <TransitionContext.Provider
      value={{
        isTransitioning,
        type,
        color,
        imgUrl,
        radius,
        imageRadius,
        centerPos,
        isBackTransition,
        startTransition,
        startBackTransition,
        playInTransition,
        playInDetailTransition,
        setTransitionState,
        resetTransition
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransitionContext = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransitionContext must be used within a TransitionProvider');
  }
  return context;
};
