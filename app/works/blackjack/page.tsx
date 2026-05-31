'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BackToMapButton from '../components/BackToMapButton';
import { useBlackjack } from './hooks/useBlackjack';
import { soundManager } from './logic/SoundManager';
import { useTransitionContext } from '../../context/TransitionContext';

const BlackjackCanvas = dynamic(
  () => import('./components/BlackjackCanvas'),
  { ssr: false }
);

export default function BlackjackPage() {
  const { holdTransition } = useTransitionContext();

  useEffect(() => {
    holdTransition();
  }, [holdTransition]);

  const {
    playerHand,
    dealerHand,
    stage,
    bet,
    balance,
    message,
    winner,
    playerScore,
    dealerScore,
    startNewGame,
    placeBet,
    deal,
    hit,
    stand,
    doubleDown,
    dealerDrawCard,
    resolveGame,
    resolveBust
  } = useBlackjack();

  const [inputBet, setInputBet] = useState<number>(100);

  // 지연된 UI 표시용 상태 선언
  const [displayedStage, setDisplayedStage] = useState(stage);
  const [displayedBet, setDisplayedBet] = useState(bet);
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [displayedWinner, setDisplayedWinner] = useState(winner);
  const [displayedPlayerScore, setDisplayedPlayerScore] = useState(playerScore);
  const [displayedDealerScore, setDisplayedDealerScore] = useState(dealerScore);

  const [isAnimating, setIsAnimating] = useState(false);

  // 애니메이션이 끝나거나, 대기/배팅 상태일 때 즉각적으로 UI 상태를 동기화
  useEffect(() => {
    if (!isAnimating || stage === 'READY' || stage === 'BETTING') {
      setDisplayedStage(stage);
      setDisplayedBet(bet);
      setDisplayedBalance(balance);
      setDisplayedMessage(message);
      setDisplayedWinner(winner);
      setDisplayedPlayerScore(playerScore);
      setDisplayedDealerScore(dealerScore);
    }
  }, [isAnimating, stage, bet, balance, message, winner, playerScore, dealerScore]);

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

  // 문양 심볼과 색상 가져오기
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'spades': return { char: '♠', color: '#2C2C2C' };
      case 'hearts': return { char: '♥', color: '#D32F2F' };
      case 'diamonds': return { char: '♦', color: '#D32F2F' };
      case 'clubs': return { char: '♣', color: '#2C2C2C' };
      default: return { char: '?', color: '#666' };
    }
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setInputBet(val);
    }
  };

  // 사용자 첫 클릭 시 Web Audio API 활성화 연동을 위한 핸들러
  const handleStartGame = () => {
    soundManager.init();
    startNewGame();
  };

  const handleSetBet = () => {
    soundManager.init();
    placeBet(inputBet);
  };

  const handleDeal = () => {
    soundManager.init();
    setIsAnimating(true);
    deal();
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

  const handleDoubleDown = () => {
    soundManager.init();
    setIsAnimating(true);
    doubleDown();
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
      {/* 맵으로 돌아가기 버튼 (Z-Index 부여하여 3D 화면 위에 노출) */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100 }}>
        <BackToMapButton />
      </div>

      {/* 3D WebGL Canvas 영역 (전체 화면으로 덮음) */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <BlackjackCanvas
          playerHand={playerHand}
          dealerHand={dealerHand}
          stage={stage}
          winner={displayedWinner}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={() => setIsAnimating(false)}
        />
      </div>

      {/* HUD 오버레이 영역 (Z-Index 10으로 올려서 3D 위에 띄움) */}
      
      {/* 1. 상단 알림 메시지 보드 (더 크고 굵게, 중앙 상단에 배치) */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(30, 70, 32, 0.75)', // 살짝 초록 톤이 들어간 고밀도 유광 보드
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px solid rgba(255, 215, 0, 0.65)', // 고대비 금색 테두리
          padding: '16px 48px',
          borderRadius: '35px',
          color: '#FFFFFF',
          fontSize: '1.45rem',
          fontWeight: '700',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 10,
          textAlign: 'center',
          minWidth: '320px',
          letterSpacing: '0.5px',
          pointerEvents: 'none' // 3D 조작 방해 차단
        }}
      >
        {displayedMessage}
      </div>

      {/* 2. 하단 중앙 대형 통합 대시보드 HUD (Balance, Bet, Scores, Buttons 통합) */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '720px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '24px 36px',
          color: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* 상단 정보행 (스탯 & 스코어) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%', 
          borderBottom: '1px dashed rgba(255,255,255,0.25)', 
          paddingBottom: '16px' 
        }}>
          {/* 스탯 표시 (Balance & Bet) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.95rem', color: '#B2DFDB', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>
              🎲 {displayedStage}
            </span>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 'bold' }}>
                💰 Balance: <span style={{ color: '#FFD700' }}>${displayedBalance}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#E0E0E0' }}>
                🃏 Bet: <span style={{ color: '#FF9800' }}>${displayedBet}</span>
              </div>
            </div>
          </div>

          {/* 스코어 표시 (Dealer & Player) */}
          {displayedStage !== 'READY' && displayedStage !== 'BETTING' && (
            <div style={{ display: 'flex', gap: '24px', fontWeight: 'bold' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#B0BEC5', letterSpacing: '1px' }}>DEALER</div>
                <span style={{ color: '#FFD700', fontSize: '1.6rem' }}>{displayedDealerScore}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#B0BEC5', letterSpacing: '1px' }}>PLAYER</div>
                <span style={{ color: '#FFD700', fontSize: '1.6rem' }}>{displayedPlayerScore}</span>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼행 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
          {displayedStage === 'READY' && (
            <button 
              onClick={handleStartGame} 
              disabled={isAnimating}
              style={{ ...btnStyle('#FFD700', '#2C2C2C'), opacity: isAnimating ? 0.5 : 1, cursor: isAnimating ? 'not-allowed' : 'pointer' }}
            >
              Start Game
            </button>
          )}

          {displayedStage === 'BETTING' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              <input
                type="number"
                value={inputBet}
                onChange={handleBetChange}
                disabled={isAnimating}
                min={10}
                max={displayedBalance}
                step={50}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1.2rem',
                  width: '80px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  outline: 'none',
                  backgroundColor: '#FFF',
                  color: '#000',
                  opacity: isAnimating ? 0.5 : 1
                }}
              />
              <button 
                onClick={handleSetBet} 
                disabled={isAnimating}
                style={{ ...btnStyle('#FF9800', '#FFF'), opacity: isAnimating ? 0.5 : 1, cursor: isAnimating ? 'not-allowed' : 'pointer' }}
              >
                Bet
              </button>
              <button 
                onClick={handleDeal} 
                disabled={isAnimating || displayedBet === 0} 
                style={{ 
                  ...btnStyle('#4CAF50', '#FFF'), 
                  opacity: (isAnimating || displayedBet === 0) ? 0.5 : 1, 
                  cursor: (isAnimating || displayedBet === 0) ? 'not-allowed' : 'pointer' 
                }}
              >
                Deal
              </button>
            </div>
          )}

          {displayedStage === 'PLAYER_TURN' && (
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              <button 
                onClick={handleHit} 
                disabled={isAnimating}
                style={{ ...btnStyle('#E57373', '#FFF'), opacity: isAnimating ? 0.5 : 1, cursor: isAnimating ? 'not-allowed' : 'pointer' }}
              >
                Hit
              </button>
              <button 
                onClick={handleStand} 
                disabled={isAnimating}
                style={{ ...btnStyle('#81C784', '#FFF'), opacity: isAnimating ? 0.5 : 1, cursor: isAnimating ? 'not-allowed' : 'pointer' }}
              >
                Stand
              </button>
              <button
                onClick={handleDoubleDown}
                disabled={isAnimating || displayedBalance < displayedBet}
                style={{ 
                  ...btnStyle('#64B5F6', '#FFF'), 
                  opacity: (isAnimating || displayedBalance < displayedBet) ? 0.5 : 1, 
                  cursor: (isAnimating || displayedBalance < displayedBet) ? 'not-allowed' : 'pointer' 
                }}
              >
                Double
              </button>
            </div>
          )}

          {displayedStage === 'RESOLVED' && (
            <button 
              onClick={handleStartGame} 
              disabled={isAnimating}
              style={{ ...btnStyle('#00B0FF', '#FFF'), opacity: isAnimating ? 0.5 : 1, cursor: isAnimating ? 'not-allowed' : 'pointer' }}
            >
              Play Again
            </button>
          )}
        </div>
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
