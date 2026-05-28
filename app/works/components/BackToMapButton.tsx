'use client';

import React from 'react';
import { useTransitionContext } from '../../context/TransitionContext';
import { PORTFOLIO_MAP } from '../../components/canvas/title/data';

export default function BackToMapButton() {
  const { startBackTransition } = useTransitionContext();
  
  const handleBackToMap = () => {
    let nodeColor = '#2C2C2C';
    let nodeImg = '';
    if (typeof window !== 'undefined') {
      const savedFocused = sessionStorage.getItem('portfolio_focused_node');
      if (savedFocused && PORTFOLIO_MAP[savedFocused]) {
        nodeColor = PORTFOLIO_MAP[savedFocused].color || '#2C2C2C';
        nodeImg = PORTFOLIO_MAP[savedFocused].img || '';
      }
    }
    startBackTransition(nodeColor, nodeImg, '/');
  };
  
  return (
    <button
      onClick={handleBackToMap}
      style={{
        position: 'fixed', top: '24px', left: '24px', zIndex: 1000,
        background: '#FFF9C4', color: '#2C2C2C', border: 'none',
        padding: '12px 24px', fontSize: '1.4rem', cursor: 'pointer',
        fontFamily: "'Nanum Pen Script', cursive",
        boxShadow: '1px 3px 6px rgba(0,0,0,0.15)',
        transform: 'rotate(-2deg)',
        borderLeft: '3.5px solid rgba(0,0,0,0.15)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'rotate(1deg) scale(1.05)';
        e.currentTarget.style.boxShadow = '2px 6px 12px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'rotate(-2deg) scale(1)';
        e.currentTarget.style.boxShadow = '1px 3px 6px rgba(0,0,0,0.15)';
      }}
    >
      ← 지도 맵으로 돌아가기
    </button>
  );
}
