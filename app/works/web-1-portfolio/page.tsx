'use client';

import React from 'react';
import BackToMapButton from '../components/BackToMapButton';

export default function Web1PortfolioPage() {
  return (
    <main style={{ padding: '120px 24px 60px 24px', display: 'flex', justifyContent: 'center' }}>
      {/* 맵으로 돌아가기 버튼 */}
      <BackToMapButton />

      {/* 아날로그 편지/엽서 느낌의 간단한 카드 */}
      <article 
        style={{
          position: 'relative',
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#FDFCF8',
          padding: '48px 36px 36px 36px',
          fontFamily: "'Nanum Pen Script', cursive",
          // 아날로그 수제 종이 질감 연출
          filter: 'url(#static-paper-edge) drop-shadow(4px 8px 16px rgba(0,0,0,0.1))',
          transform: 'rotate(1deg)',
          textAlign: 'center'
        }}
      >
        {/* 위에 붙인 마스킹 테이프 장식 */}
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%) rotate(-1deg)',
          width: '100px', height: '20px', backgroundColor: 'rgba(245, 235, 185, 0.85)',
          borderLeft: '2.5px dashed rgba(0,0,0,0.1)', borderRight: '2.5px dashed rgba(0,0,0,0.1)',
        }} />

        <h1 style={{ fontSize: '3rem', color: '#E08E6D', margin: '0 0 16px 0', filter: 'url(#handwriting-ink)' }}>
          📬 페이지 이동 완료!
        </h1>
        
        <p style={{ fontSize: '1.8rem', color: '#2C2C2C', lineHeight: '30px', margin: '0 0 24px 0', filter: 'url(#handwriting-ink)' }}>
          이곳은 첫 번째 작업물인 <strong>Portfolio Site (web-1)</strong>의 웹 페이지 공간입니다.<br />
          성공적으로 전체 화면 라우팅이 완료되었습니다.
        </p>

        <div style={{ borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '16px', fontSize: '1.2rem', color: '#666' }}>
          작업물 개발 가이드: <code>app/works/web-1-portfolio/page.tsx</code>에서 본 페이지 내용을 편집하여 자신만의 멋진 포트폴리오 웹을 구현해 보세요.
        </div>
      </article>
    </main>
  );
}
