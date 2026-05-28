'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type TransitionType = 'in' | 'out' | 'in-detail' | null;

interface TransitionContextProps {
  isTransitioning: boolean;
  type: TransitionType;
  color: string;
  imgUrl: string;
  radius: number;
  imageRadius: number;
  centerPos: { x: number; y: number } | null;
  startTransition: (targetUrl: string, screenX: number, screenY: number, radius: number, imageRadius: number, imgUrl: string, color: string) => void;
  startBackTransition: (color: string, imgUrl: string, callbackUrl?: string) => void;
  playInTransition: (screenX: number, screenY: number, radius: number, imageRadius: number, imgUrl: string, color: string) => void;
  playInDetailTransition: () => void;
  setTransitionState: (state: { isTransitioning: boolean; type: TransitionType; centerPos: { x: number; y: number } | null; radius: number; imageRadius: number; imgUrl: string; color: string }) => void;
  resetTransition: () => void;
}

const TransitionContext = createContext<TransitionContextProps | undefined>(undefined);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [type, setType] = useState<TransitionType>(null);
  const [color, setColor] = useState('#2C2C2C');
  const [imgUrl, setImgUrl] = useState('');
  const [radius, setRadius] = useState(80);
  const [imageRadius, setImageRadius] = useState(75);
  const [centerPos, setCenterPos] = useState<{ x: number; y: number } | null>(null);

  const startTransition = useCallback((targetUrl: string, screenX: number, screenY: number, nodeRadius: number, nodeImageRadius: number, nodeImg: string, nodeColor: string) => {
    setIsTransitioning(true);
    setType('out');
    setCenterPos({ x: screenX, y: screenY });
    setRadius(nodeRadius);
    setImageRadius(nodeImageRadius);
    setImgUrl(nodeImg);
    setColor(nodeColor);

    // Out-transition 애니메이션 완료(800ms) 후 실제 라우팅 수행
    setTimeout(() => {
      router.push(targetUrl);
    }, 850);
  }, [router]);

  const startBackTransition = useCallback((nodeColor: string, nodeImg: string, callbackUrl: string = '/') => {
    setIsTransitioning(true);
    setType('out');
    if (typeof window !== 'undefined') {
      setCenterPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    setColor(nodeColor);
    setImgUrl(nodeImg); 
    setRadius(80);
    setImageRadius(75);

    setTimeout(() => {
      router.push(callbackUrl);
    }, 850);
  }, [router]);

  const playInTransition = useCallback((screenX: number, screenY: number, nodeRadius: number, nodeImageRadius: number, nodeImg: string, nodeColor: string) => {
    setIsTransitioning(true);
    setType('in');
    setCenterPos({ x: screenX, y: screenY });
    setRadius(nodeRadius);
    setImageRadius(nodeImageRadius);
    setImgUrl(nodeImg);
    setColor(nodeColor);
  }, []);

  const playInDetailTransition = useCallback(() => {
    setIsTransitioning(true);
    setType('in-detail');
    if (typeof window !== 'undefined') {
      setCenterPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
  }, []);

  const setTransitionState = useCallback((state: { isTransitioning: boolean; type: TransitionType; centerPos: { x: number; y: number } | null; radius: number; imageRadius: number; imgUrl: string; color: string }) => {
    setIsTransitioning(state.isTransitioning);
    setType(state.type);
    setCenterPos(state.centerPos);
    setRadius(state.radius);
    setImageRadius(state.imageRadius);
    setImgUrl(state.imgUrl);
    setColor(state.color);
  }, []);

  const resetTransition = useCallback(() => {
    setIsTransitioning(false);
    setType(null);
    setCenterPos(null);
    setImgUrl('');
    setRadius(80);
    setImageRadius(75);
  }, []);

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
