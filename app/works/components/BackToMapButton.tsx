'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BackToMapButton() {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.push('/')}
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
