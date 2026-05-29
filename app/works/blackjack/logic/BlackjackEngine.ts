export interface Card {
  id: string; // 예: 'S_A', 'H_10'
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: string; // 'A', '2'~'10', 'J', 'Q', 'K'
  score: number; // 기본 계산 스코어
  isHidden: boolean; // 카드 뒷면 상태 여부 (딜러 두번째 카드 등)
  dealOrder: number; // 딜링되는 순서 (애니메이션 순차 처리에 활용)
}

export type GameStage = 'READY' | 'BETTING' | 'DEALING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESOLVED';

export interface BlackjackState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  stage: GameStage;
  bet: number;
  balance: number;
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
  bet: 0,
  balance: 1000, // 기본 자금 $1000
  message: '원하시는 배팅 금액을 설정하고 Deal을 누르세요.',
  winner: null,
  dealCount: 0,
};

// 4. 상태 머신 리듀서
export const blackjackReducer = (state: BlackjackState, action: any): BlackjackState => {
  switch (action.type) {
    case 'RESET_GAME': {
      return {
        ...state,
        deck: shuffleDeck(createDeck()),
        playerHand: [],
        dealerHand: [],
        stage: 'BETTING',
        winner: null,
        message: '배팅을 완료한 뒤 딜 버튼을 누르세요.',
        dealCount: 0,
      };
    }

    case 'PLACE_BET': {
      if (state.stage !== 'BETTING') return state;
      const amount = action.payload;
      if (amount <= 0 || amount > state.balance) {
        return { ...state, message: '올바르지 않은 배팅 금액입니다.' };
      }
      return {
        ...state,
        bet: amount,
        message: `현재 배팅금: $${amount}. 게임을 시작하려면 Deal을 누르세요.`,
      };
    }

    case 'START_DEALING': {
      if (state.stage !== 'BETTING' || state.bet === 0) {
        return { ...state, message: '배팅 금액을 먼저 설정해야 합니다!' };
      }

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
      const dealerVisibleScore = calculateHandScore(dealerHand); // d2는 isHidden 상태이므로 제외됨

      // 내추럴 블랙잭 여부 확인을 위해 임시로 딜러 전체 점수도 계산
      const dealerActualScore = calculateHandScore(dealerHand.map(c => ({ ...c, isHidden: false })));

      // 만약 플레이어가 내추럴 블랙잭인 경우 즉시 결과 판정 준비
      if (playerScore === 21) {
        // 딜러의 숨겨진 카드를 오픈하여 승패 결정
        const revealedDealerHand = dealerHand.map(c => ({ ...c, isHidden: false }));
        
        if (dealerActualScore === 21) {
          return {
            ...state,
            deck: newDeck,
            playerHand,
            dealerHand: revealedDealerHand,
            stage: 'RESOLVED',
            winner: 'push',
            balance: state.balance, // 배팅금 돌려받음
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
            balance: state.balance + Math.floor(state.bet * 1.5), // 블랙잭 1.5배 지급
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
        balance: state.balance - state.bet,
        message: `플레이어 차례입니다. (현재 점수: ${playerScore})`,
        dealCount,
      };
    }

    case 'HIT': {
      if (state.stage !== 'PLAYER_TURN') return state;

      const newDeck = [...state.deck];
      const nextCard = { ...newDeck.pop()!, isHidden: false, dealOrder: state.dealCount };
      const playerHand = [...state.playerHand, nextCard];
      const playerScore = calculateHandScore(playerHand);

      if (playerScore > 21) {
        // 플레이어 버스트 (Bust)로 즉시 패배
        // 딜러의 카드도 오픈해줌
        const revealedDealer = state.dealerHand.map(c => ({ ...c, isHidden: false }));
        return {
          ...state,
          deck: newDeck,
          playerHand,
          dealerHand: revealedDealer,
          stage: 'RESOLVED',
          winner: 'dealer',
          message: `버스트! 플레이어가 21점을 초과하여 딜러가 승리했습니다. (최종 점수: ${playerScore})`,
          dealCount: state.dealCount + 1,
        };
      }

      return {
        ...state,
        deck: newDeck,
        playerHand,
        message: `Hit 완료. 플레이어 차례입니다. (현재 점수: ${playerScore})`,
        dealCount: state.dealCount + 1,
      };
    }

    case 'DOUBLE_DOWN': {
      if (state.stage !== 'PLAYER_TURN') return state;
      // 잔액이 추가 배팅금보다 충분해야 함
      if (state.balance < state.bet) {
        return { ...state, message: '더블 다운을 위한 추가 금액이 부족합니다.' };
      }

      const originalBet = state.bet;
      const newDeck = [...state.deck];
      const nextCard = { ...newDeck.pop()!, isHidden: false, dealOrder: state.dealCount };
      const playerHand = [...state.playerHand, nextCard];
      const playerScore = calculateHandScore(playerHand);

      const updatedBalance = state.balance - originalBet; // 추가 배팅 차감
      const updatedBet = originalBet * 2;

      if (playerScore > 21) {
        const revealedDealer = state.dealerHand.map(c => ({ ...c, isHidden: false }));
        return {
          ...state,
          deck: newDeck,
          playerHand,
          dealerHand: revealedDealer,
          stage: 'RESOLVED',
          winner: 'dealer',
          bet: updatedBet,
          balance: updatedBalance,
          message: `더블 다운 버스트! 플레이어가 21점을 초과해 패배했습니다. (점수: ${playerScore})`,
          dealCount: state.dealCount + 1,
        };
      }

      // 더블 다운은 한 장만 추가하고 강제로 Stand 턴으로 이행
      // 이 시점에서는 플레이어 턴이 끝나고 딜러가 동작하게 해야 함. 
      // 코드가 즉시 딜러 턴으로 전환되도록 처리
      return blackjackReducer(
        {
          ...state,
          deck: newDeck,
          playerHand,
          bet: updatedBet,
          balance: updatedBalance,
          stage: 'DEALER_TURN',
          dealCount: state.dealCount + 1,
        },
        { type: 'DEALER_PLAY' }
      );
    }

    case 'STAND': {
      if (state.stage !== 'PLAYER_TURN') return state;
      return blackjackReducer(
        {
          ...state,
          stage: 'DEALER_TURN',
        },
        { type: 'DEALER_PLAY' }
      );
    }

    case 'DEALER_PLAY': {
      // 딜러의 숨겨진 카드를 먼저 보이게 설정
      let dealerHand = state.dealerHand.map((c) => ({ ...c, isHidden: false }));
      let newDeck = [...state.deck];
      let dealCount = state.dealCount;

      let dealerScore = calculateHandScore(dealerHand);

      // 딜러는 소프트/하드 17 미만이면 무조건 Hit 해야 함 (보통 S17 규칙 적용)
      while (dealerScore < 17) {
        const nextCard = { ...newDeck.pop()!, isHidden: false, dealOrder: dealCount++ };
        dealerHand.push(nextCard);
        dealerScore = calculateHandScore(dealerHand);
      }

      const playerScore = calculateHandScore(state.playerHand);
      let winner: BlackjackState['winner'] = null;
      let payout = 0;
      let msg = '';

      if (dealerScore > 21) {
        winner = 'player';
        payout = state.bet * 2;
        msg = `딜러 버스트! 플레이어가 승리했습니다! (딜러 점수: ${dealerScore})`;
      } else if (playerScore > dealerScore) {
        winner = 'player';
        payout = state.bet * 2;
        msg = `플레이어 승리! (플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      } else if (playerScore < dealerScore) {
        winner = 'dealer';
        payout = 0;
        msg = `딜러 승리! (플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      } else {
        winner = 'push';
        payout = state.bet;
        msg = `무승부(Push)입니다. (플레이어: ${playerScore} vs 딜러: ${dealerScore})`;
      }

      return {
        ...state,
        deck: newDeck,
        dealerHand,
        stage: 'RESOLVED',
        winner,
        balance: state.balance + payout,
        message: msg,
        dealCount,
      };
    }

    default:
      return state;
  }
};
