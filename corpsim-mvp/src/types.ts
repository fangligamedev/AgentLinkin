// src/types.ts
// CorpSim MVP 类型定义

export type Personality = 'aggressive' | 'conservative' | 'innovative';

export type GamePhase = 'setup' | 'hiring' | 'product' | 'market' | 'result';

export interface Candidate {
  id: string;
  name: string;
  skill: number; // 1-10
  salary: number; // 年薪
  trait: string;
  hiredBy: string | null;
}

export interface Employee {
  id: string;
  name: string;
  skill: number;
  salary: number;
  role: 'dev' | 'sales' | 'marketing';
}

export interface Product {
  version: string;
  features: number;
  quality: number;
  direction?: 'features' | 'performance' | 'innovation';
}

export interface Company {
  id: string;
  name: string;
  ceoName: string;
  personality: Personality;
  cash: number;
  employees: Employee[];
  product: Product;
  marketShare: number;
  price: number;
  marketingBudget: number;
  history: GameEvent[];
}

export interface GameEvent {
  round: number;
  type: 'hiring' | 'product' | 'market';
  description: string;
  decision: string;
  result?: string;
}

export interface MarketResult {
  companyId: string;
  score: number;
  breakdown: {
    productScore: number;
    brandScore: number;
    priceScore: number;
    channelScore: number;
  };
  newShare: number;
  revenue: number;
}

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  bonus: {
    type: 'product' | 'price' | 'marketing';
    target?: string;
    value: number;
  };
}

export interface GameState {
  phase: GamePhase;
  round: number;
  maxRounds: number;
  companies: Company[];
  candidates: Candidate[];
  randomEvent: RandomEvent | null;
  marketResults: MarketResult[];
  messages: Message[];
  gameOver: boolean;
}

export interface Message {
  id: string;
  companyId: string;
  channel: 'general' | 'hiring' | 'product' | 'marketing';
  author: string;
  avatar: string;
  content: string;
  timestamp: number;
}

export interface CEOAgentConfig {
  name: string;
  companyName: string;
  personality: Personality;
}
