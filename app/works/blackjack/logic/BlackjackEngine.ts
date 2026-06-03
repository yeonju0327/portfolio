export interface Card {
  id: string; // 예: 'S_A', 'H_10'
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: string; // 'A', '2'~'10', 'J', 'Q', 'K'
  score: number; // 기본 계산 스코어
  isHidden: boolean; // 카드 뒷면 상태 여부 (딜러 두번째 카드 등)
  dealOrder: number; // 딜링되는 순서 (애니메이션 순차 처리에 활용)
}

export type GameStage = 'READY' | 'DEALING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESOLVED';

export interface BlackjackState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  stage: GameStage;
  message: string;
  winner: 'player' | 'dealer' | 'push' | null;
  dealCount: number; // 지금까지 나눠준 카드 개수 (dealOrder 부여용)
}

const SUITS: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 1. 카드 덱 생성
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    VALUES.forEach((value) => {
      let score = 0;
      if (value === 'A') {
        score = 11;
      } else if (['J', 'Q', 'K'].includes(value)) {
        score = 10;
      } else {
        score = parseInt(value, 10);
      }

      deck.push({
        id: `${suit.charAt(0).toUpperCase()}_${value}`,
        suit,
        value,
        score,
        isHidden: false,
        dealOrder: -1,
      });
    });
  });
  return deck;
};

// 2. 피셔-예이츠 셔플
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 3. 핸드 점수 계산 (Aces 유동적 처리)
export const calculateHandScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    // 딜러의 히든 카드는 스코어 계산에서 일시적으로 감춤 (실제 블랙잭 룰 기준)
    if (card.isHidden) continue;

    if (card.value === 'A') {
      aces += 1;
      score += 11;
    } else {
      score += card.score;
    }
  }

  // 합산이 21을 초과하면 A를 1로 취급
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
};

// 초기 상태 정의
export const INITIAL_STATE: BlackjackState = {
  deck: [],
  playerHand: [],
  dealerHand: [],
  stage: 'READY',
  message: '게임을 시작하려면 바닥의 START 버튼을 누르세요.',
  winner: null,
  dealCount: 0,
};

// 4. 상태 머신 리듀서
export const blackjackReducer = (state: BlackjackState, action: any): BlackjackState => {
  switch (action.type) {
    case 'RESET_GAME': {
      const newDeck = shuffleDeck(createDeck());
      return {
        ...state,
        deck: newDeck,
        playerHand: [],
        dealerHand: [],
        stage: 'DEALING',
        winner: null,
        message: '카드를 분배하는 중입니다...',
        dealCount: 0,
      };
    }

    case 'DEAL_INITIAL_CARDS': {
      if (state.stage !== 'DEALING') return state;

      const newDeck = [...state.deck];
      const playerHand: Card[] = [];
      const dealerHand: Card[] = [];
      let dealCount = 0;

      // 1. 플레이어 첫 번째 카드
      const p1 = { ...newDeck.pop()!, isHidden: false, dealOrder: dealCount++ };
      playerHand.push(p1);

      // 2. 딜러 첫 번째 카드 (오픈)
      const d1 = { ...newDeck.pop()!, isHidden: false, dealOrder: dealCount++ };
      dealerHand.push(d1);

      // 3. 플레이어 두 번째 카드
      const p2 = { ...newDeck.pop()!, isHidden: false, dealOrder: dealCount++ };
      playerHand.push(p2);

      // 4. 딜러 두 번째 카드 (히든/홀 카드)
      const d2 = { ...newDeck.pop()!, isHidden: true, dealOrder: dealCount++ };
      dealerHand.push(d2);

      const playerScore = calculateHandScore(playerHand);
      
      // 내추럴 블랙잭 여부 확인을 위해 임시로 딜러 전체 점수도 계산
      const dealerActualScore = calculateHandScore(dealerHand.map(c => ({ ...c, isHidden: false })));

      // 만약 플레이어가 내추럴 블랙잭인 경우 즉시 결과 판정 준비
      if (playerScore === 21) {
        const revealedDealerHand = dealerHand.map(c => ({ ...c, isHidden: false }));
        
        if (dealerActualScore === 21) {
          return {
            ...state,
            deck: newDeck,
            playerHand,
            dealerHand: revealedDealerHand,
            stage: 'RESOLVED',
            winner: 'push',
            message: '둘 다 블랙잭입니다! 무승부(Push)입니다.',
            dealCount,
          };
        } else {
          return {
            ...state,
            deck: newDeck,
            playerHand,
            dealerHand: revealedDealerHand,
            stage: 'RESOLVED',
            winner: 'player',
            message: '블랙잭! 플레이어가 승리했습니다!',
            dealCount,
          };
        }
      }

      return {
        ...state,
        deck: newDeck,
        playerHand,
        dealerHand,
        stage: 'PLAYER_TURN',
        message: `플레이어 차례입니다. (현재 점수: ${playerScore})`,
        dealCount,
      };
    }

    case 'HIT': {
      if (state.stage !== 'PLAYER_TURN') return state;
      if (calculateHandScore(state.playerHand) > 21) return state;

      const newDeck = [...state.deck];
      const nextCard = { ...newDeck.pop()!, isHidden: false, dealOrder: state.dealCount };
      const playerHand = [...state.playerHand, nextCard];
      const playerScore = calculateHandScore(playerHand);

      return {
        ...state,
        deck: newDeck,
        playerHand,
        message: `Hit 완료. 플레이어 차례입니다. (현재 점수: ${playerScore})`,
        dealCount: state.dealCount + 1,
      };
    }

    case 'STAND': {
      if (state.stage !== 'PLAYER_TURN') return state;
      if (calculateHandScore(state.playerHand) > 21) return state;
      
      // 딜러의 숨겨진 카드를 공개 상태로 변경하고 stage를 DEALER_TURN으로 보냄
      const revealedDealerHand = state.dealerHand.map((c) => ({ ...c, isHidden: false }));
      const dealerScore = calculateHandScore(revealedDealerHand);
      
      return {
        ...state,
        dealerHand: revealedDealerHand,
        stage: 'DEALER_TURN',
        message: `딜러 차례입니다. (현재 점수: ${dealerScore})`,
      };
    }

    case 'DEALER_DRAW_CARD': {
      if (state.stage !== 'DEALER_TURN') return state;

      const newDeck = [...state.deck];
      if (newDeck.length === 0) return state;

      const nextCard = { ...newDeck.pop()!, isHidden: false, dealOrder: state.dealCount };
      const dealerHand = [...state.dealerHand, nextCard];
      const dealerScore = calculateHandScore(dealerHand);

      return {
        ...state,
        deck: newDeck,
        dealerHand,
        dealCount: state.dealCount + 1,
        message: `딜러가 카드를 한 장 가져갑니다. (현재 점수: ${dealerScore})`,
      };
    }

    case 'RESOLVE_BUST': {
      if (state.stage !== 'PLAYER_TURN') return state;

      const playerScore = calculateHandScore(state.playerHand);
      const revealedDealer = state.dealerHand.map(c => ({ ...c, isHidden: false }));

      return {
        ...state,
        dealerHand: revealedDealer,
        stage: 'RESOLVED',
        winner: 'dealer',
        message: `버스트! 플레이어가 21점을 초과하여 딜러가 승리했습니다. (최종 점수: ${playerScore})`,
      };
    }

    case 'RESOLVE_GAME': {
      if (state.stage !== 'DEALER_TURN') return state;

      const playerScore = calculateHandScore(state.playerHand);
      const dealerScore = calculateHandScore(state.dealerHand);

      let winner: BlackjackState['winner'] = null;
      let msg = '';

      if (dealerScore > 21) {
        winner = 'player';
        msg = `딜러 버스트! 플레이어가 승리했습니다! (최종 점수 - 플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      } else if (playerScore > dealerScore) {
        winner = 'player';
        msg = `플레이어 승리! (최종 점수 - 플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      } else if (playerScore < dealerScore) {
        winner = 'dealer';
        msg = `딜러 승리! (최종 점수 - 플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      } else {
        winner = 'push';
        msg = `무승부(Push)입니다. (최종 점수 - 플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      }

      return {
        ...state,
        stage: 'RESOLVED',
        winner,
        message: msg,
      };
    }

    default:
      return state;
  }
};
