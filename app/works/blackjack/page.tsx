'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useBlackjack } from './hooks/useBlackjack';
import { soundManager } from './logic/SoundManager';
import { useTransitionContext } from '../../context/TransitionContext';
import { PORTFOLIO_MAP } from '../../components/canvas/title/data';

const BlackjackCanvas = dynamic(
  () => import('./components/BlackjackCanvas'),
  { ssr: false }
);

export default function BlackjackPage() {
  const { holdTransition, startBackTransition } = useTransitionContext();

  useEffect(() => {
    holdTransition();
  }, [holdTransition]);

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

  const {
    playerHand,
    dealerHand,
    stage,
    message,
    winner,
    playerScore,
    dealerScore,
    startNewGame,
    dealInitialCards,
    hit,
    stand,
    dealerDrawCard,
    resolveGame,
    resolveBust
  } = useBlackjack();

  // 지연된 UI 표시용 상태 선언
  const [displayedStage, setDisplayedStage] = useState(stage);
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [displayedWinner, setDisplayedWinner] = useState(winner);
  const [displayedPlayerScore, setDisplayedPlayerScore] = useState(playerScore);
  const [displayedDealerScore, setDisplayedDealerScore] = useState(dealerScore);

  const [isAnimating, setIsAnimating] = useState(false);

  // 애니메이션이 끝나거나, 대기 상태일 때 즉각적으로 UI 상태를 동기화
  useEffect(() => {
    const isPlayerBustResolved = stage === 'RESOLVED' && winner === 'dealer' && playerScore > 21;
    const isDealerBustResolved = stage === 'RESOLVED' && winner === 'player' && dealerScore > 21;

    if (!isAnimating || stage === 'READY' || isPlayerBustResolved || isDealerBustResolved) {
      setDisplayedStage(stage);
      setDisplayedMessage(message);
      setDisplayedWinner(winner);
      setDisplayedPlayerScore(playerScore);
      setDisplayedDealerScore(dealerScore);
    }
  }, [isAnimating, stage, message, winner, playerScore, dealerScore]);

  // 딜러 턴의 비동기식 순차 카드 드로우 및 정산 루프 제어
  useEffect(() => {
    if (stage !== 'DEALER_TURN') return;
    if (isAnimating) return;

    if (dealerScore < 17) {
      const timer = setTimeout(() => {
        setIsAnimating(true); // 다음 카드 드로우 비행 시작 전 락 선제 확보
        dealerDrawCard();
      }, 900); // 딜링 및 뒤집기 템포 사이의 자연스러운 아날로그 간격
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        resolveGame();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [stage, isAnimating, dealerScore, dealerDrawCard, resolveGame]);

  // 플레이어 버스트(Bust) 발생 시 비행 및 뒤집기 완료 후 지연 정산 제어
  useEffect(() => {
    if (stage !== 'PLAYER_TURN') return;
    if (isAnimating) return;

    if (playerScore > 21) {
      const timer = setTimeout(() => {
        setIsAnimating(true); // 딜러 카드 뒤집기 시작 전 락 선제 확보
        resolveBust();
      }, 600); // 버스트 카드 뒤집힌 뒤의 자연스러운 아날로그 딜레이
      return () => clearTimeout(timer);
    }
  }, [stage, isAnimating, playerScore, resolveBust]);

  // 사용자 첫 클릭 시 Web Audio API 활성화 연동을 위한 핸들러
  const handleStartGame = () => {
    soundManager.init();
    
    // 1. 상태 즉각 리셋 (점수 00 및 필드 승리 조명 즉시 꺼짐)
    startNewGame();
    setDisplayedStage('DEALING');
    setDisplayedWinner(null);
    setDisplayedPlayerScore(0);
    setDisplayedDealerScore(0);
    setDisplayedMessage('카드를 분배하는 중입니다...');
    setIsAnimating(false); // 애니메이션 락 임시 해제로 리셋 상태 즉각 렌더링 유도
    
    // 2. 500ms 정돈 딜레이 후 카드 분배 및 비행 락 개시
    setTimeout(() => {
      setIsAnimating(true); // 비행 시작 락 가동
      dealInitialCards();
    }, 500);
  };

  const handleHit = () => {
    soundManager.init();
    setIsAnimating(true);
    hit();
  };

  const handleStand = () => {
    soundManager.init();
    setIsAnimating(true);
    stand();
  };

  return (
    <main style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden', 
      margin: 0, 
      padding: 0, 
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      backgroundColor: '#000000' // 전체 배경 블랙
    }}>
      {/* 3D WebGL Canvas 영역 (전체 화면으로 덮음) */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <BlackjackCanvas
          playerHand={playerHand}
          dealerHand={dealerHand}
          stage={displayedStage}
          rawStage={stage}
          winner={displayedWinner}
          playerScore={displayedPlayerScore}
          dealerScore={displayedDealerScore}
          isAnimating={isAnimating || (stage === 'PLAYER_TURN' && playerScore > 21)}
          onHit={handleHit}
          onStand={handleStand}
          onStart={handleStartGame}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={() => setIsAnimating(false)}
          onDealerBust={resolveGame}
          onBack={handleBackToMap}
        />
      </div>

    </main>
  );
}

// 공통 버튼 스타일 생성기
const btnStyle = (bg: string, fg: string) => ({
  backgroundColor: bg,
  color: fg,
  border: 'none',
  padding: '14px 28px',
  fontSize: '1.15rem',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  cursor: 'pointer',
  boxShadow: '0 4px 8px rgba(0,0,0,0.35)',
  transition: 'transform 0.1s, box-shadow 0.1s',
  outline: 'none',
});
