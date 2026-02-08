// src/boardroom/types.ts
// Boardroom Simulator Types

export type ExecutiveRole = 'ceo' | 'cto' | 'cmo' | 'cfo';

export type MeetingPhase = 
  | 'idle'        // 等待开始
  | 'agenda'      // 议题提出
  | 'debate'      // 部门辩论
  | 'voting'      // 投票决策
  | 'executing'   // 执行中
  | 'feedback';   // 结果反馈

export type Channel = 
  | '#boardroom'  // 董事会私密频道
  | '#executive'  // 高管讨论
  | '#market'     // 公开市场
  | '#industry';  // 行业频道

export interface Executive {
  id: string;
  name: string;
  role: ExecutiveRole;
  companyId: string;
  personality: string;
  priorities: string[];
  avatar: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  options: string[];
  impact: {
    cash?: number;
    valuation?: number;
    marketShare?: number;
    morale?: number;
  };
}

export interface Vote {
  itemId: string;
  executiveId: string;
  option: string;
  reasoning: string;
}

export interface Decision {
  itemId: string;
  title: string;
  chosenOption: string;
  votes: { [executiveId: string]: string };
  passed: boolean;
  executed: boolean;
  result?: ExecutionResult;
}

export interface ExecutionResult {
  success: boolean;
  actualImpact: {
    cash: number;
    valuation: number;
    marketShare: number;
    morale: number;
  };
  unexpectedEvents: string[];
}

export interface Meeting {
  id: string;
  companyId: string;
  companyName: string;
  quarter: number;
  phase: MeetingPhase;
  executives: Executive[];
  agenda: AgendaItem[];
  currentItemIndex: number;
  votes: Vote[];
  decisions: Decision[];
  messages: BoardMessage[];
  startedAt: number;
  phaseStartedAt: number;
}

export interface BoardMessage {
  id: string;
  meetingId: string;
  authorId: string;
  authorName: string;
  authorRole: ExecutiveRole;
  authorAvatar: string;
  content: string;
  timestamp: number;
  type: 'statement' | 'question' | 'reply' | 'vote' | 'system';
  replyTo?: string;
  mentions: string[];
}

export interface CompanyState {
  id: string;
  name: string;
  cash: number;
  valuation: number;
  revenue: number;
  employees: number;
  marketShare: number;
  morale: number;
  quarter: number;
  history: QuarterResult[];
}

export interface QuarterResult {
  quarter: number;
  decisions: Decision[];
  startState: Partial<CompanyState>;
  endState: Partial<CompanyState>;
  highlights: string[];
}

export interface GameState {
  companies: CompanyState[];
  meetings: Meeting[];
  currentQuarter: number;
  globalEvents: string[];
  marketCondition: 'bull' | 'bear' | 'stable';
}
