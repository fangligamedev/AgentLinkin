// src/game/gameStore.ts
// Zustand store for game state management

import { create } from 'zustand';
import { GameState, GamePhase, Company, Candidate, Message, RandomEvent } from '../types';

interface GameStore extends GameState {
  // Actions
  initGame: (companies: Company[], candidates: Candidate[]) => void;
  setPhase: (phase: GamePhase) => void;
  nextRound: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  hireCandidate: (companyId: string, candidateId: string) => void;
  setProductDirection: (companyId: string, direction: string) => void;
  setMarketDecision: (companyId: string, price: number, budget: number) => void;
  setRandomEvent: (event: RandomEvent) => void;
  setMarketResults: (results: any[]) => void;
  endGame: () => void;
  resetGame: () => void;
}

const initialState: GameState = {
  phase: 'setup',
  round: 1,
  maxRounds: 3,
  companies: [],
  candidates: [],
  randomEvent: null,
  marketResults: [],
  messages: [],
  gameOver: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  initGame: (companies, candidates) => {
    set({
      ...initialState,
      companies,
      candidates,
      phase: 'hiring',
    });
  },

  setPhase: (phase) => set({ phase }),

  nextRound: () => {
    const { round, maxRounds } = get();
    if (round < maxRounds) {
      set({ round: round + 1 });
    }
  },

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  hireCandidate: (companyId, candidateId) => {
    set((state) => ({
      companies: state.companies.map((company) => {
        if (company.id === companyId) {
          const candidate = state.candidates.find((c) => c.id === candidateId);
          if (candidate && company.cash >= candidate.salary) {
            const newEmployee = {
              id: candidateId,
              name: candidate.name,
              skill: candidate.skill,
              salary: candidate.salary,
              role: 'dev' as const,
            };
            return {
              ...company,
              cash: company.cash - candidate.salary * 0.1, // 10% as signing bonus
              employees: [...company.employees, newEmployee],
            };
          }
        }
        return company;
      }),
      candidates: state.candidates.map((c) =>
        c.id === candidateId ? { ...c, hiredBy: companyId } : c
      ),
    }));
  },

  setProductDirection: (companyId, direction) => {
    set((state) => ({
      companies: state.companies.map((company) =>
        company.id === companyId
          ? {
              ...company,
              product: {
                ...company.product,
                direction: direction as any,
              },
            }
          : company
      ),
    }));
  },

  setMarketDecision: (companyId, price, budget) => {
    set((state) => ({
      companies: state.companies.map((company) =>
        company.id === companyId
          ? {
              ...company,
              price,
              marketingBudget: budget,
              cash: company.cash - budget,
            }
          : company
      ),
    }));
  },

  setRandomEvent: (event) => set({ randomEvent: event }),

  setMarketResults: (results) => set({ marketResults: results }),

  endGame: () => set({ gameOver: true, phase: 'result' }),

  resetGame: () => set(initialState),
}));
