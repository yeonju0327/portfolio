import { useReducer, useCallback } from 'react';
import {
  blackjackReducer,
  INITIAL_STATE,
  calculateHandScore,
  Card,
  BlackjackState,
  GameStage
} from '../logic/BlackjackEngine';

export function useBlackjack() {
  const [state, dispatch] = useReducer(blackjackReducer, INITIAL_STATE);

  const startNewGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const placeBet = useCallback((amount: number) => {
    dispatch({ type: 'PLACE_BET', payload: amount });
  }, []);

  const deal = useCallback(() => {
    dispatch({ type: 'START_DEALING' });
  }, []);

  const hit = useCallback(() => {
    dispatch({ type: 'HIT' });
  }, []);

  const stand = useCallback(() => {
    dispatch({ type: 'STAND' });
  }, []);

  const doubleDown = useCallback(() => {
    dispatch({ type: 'DOUBLE_DOWN' });
  }, []);

  const dealerDrawCard = useCallback(() => {
    dispatch({ type: 'DEALER_DRAW_CARD' });
  }, []);

  const resolveGame = useCallback(() => {
    dispatch({ type: 'RESOLVE_GAME' });
  }, []);

  const resolveBust = useCallback(() => {
    dispatch({ type: 'RESOLVE_BUST' });
  }, []);

  const playerScore = calculateHandScore(state.playerHand);
  
  // 딜러의 핸드 중 숨겨진 카드가 있으면(isHidden: true) 점수 합계 계산 시 딜러 턴이 아닐 때 가려진 점수를 반환함
  const dealerScore = calculateHandScore(state.dealerHand);

  return {
    // 상태 값들
    deck: state.deck,
    playerHand: state.playerHand,
    dealerHand: state.dealerHand,
    stage: state.stage,
    bet: state.bet,
    balance: state.balance,
    message: state.message,
    winner: state.winner,
    dealCount: state.dealCount,
    
    // 점수 계산 유틸리티
    playerScore,
    dealerScore,
    
    // 액션 핸들러
    startNewGame,
    placeBet,
    deal,
    hit,
    stand,
    doubleDown,
    dealerDrawCard,
    resolveGame,
    resolveBust
  };
}
export type { Card, BlackjackState, GameStage };
