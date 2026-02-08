// src/boardroom/store.ts
import { create } from 'zustand';
import { Meeting, CompanyState, BoardMessage, MeetingPhase, GameState } from './types';

interface BoardroomStore {
  // State
  companies: CompanyState[];
  meetings: Meeting[];
  currentQuarter: number;
  activeMeetingId: string | null;
  messages: BoardMessage[];
  isRunning: boolean;
  gameSpeed: 1 | 2 | 4;
  
  // Actions
  initGame: (companies: CompanyState[]) => void;
  startMeeting: (companyId: string) => void;
  addMessage: (message: BoardMessage) => void;
  updateMeetingPhase: (meetingId: string, phase: MeetingPhase) => void;
  updateCompany: (companyId: string, updates: Partial<CompanyState>) => void;
  endMeeting: (meetingId: string) => void;
  nextQuarter: () => void;
  setGameSpeed: (speed: 1 | 2 | 4) => void;
  toggleRunning: () => void;
  reset: () => void;
}

export const useBoardroomStore = create<BoardroomStore>((set, get) => ({
  companies: [],
  meetings: [],
  currentQuarter: 1,
  activeMeetingId: null,
  messages: [],
  isRunning: false,
  gameSpeed: 1,

  initGame: (companies) => {
    set({ 
      companies, 
      meetings: [],
      currentQuarter: 1,
      messages: [],
    });
  },

  startMeeting: (companyId) => {
    const company = get().companies.find(c => c.id === companyId);
    if (!company) return;

    const meeting: Meeting = {
      id: `meeting-${companyId}-${Date.now()}`,
      companyId,
      companyName: company.name,
      quarter: get().currentQuarter,
      phase: 'idle',
      executives: [],
      agenda: [],
      currentItemIndex: 0,
      votes: [],
      decisions: [],
      messages: [],
      startedAt: Date.now(),
      phaseStartedAt: Date.now(),
    };

    set(state => ({
      meetings: [...state.meetings, meeting],
      activeMeetingId: meeting.id,
    }));

    return meeting;
  },

  addMessage: (message) => {
    set(state => ({
      messages: [...state.messages, message],
    }));
  },

  updateMeetingPhase: (meetingId, phase) => {
    set(state => ({
      meetings: state.meetings.map(m =>
        m.id === meetingId ? { ...m, phase, phaseStartedAt: Date.now() } : m
      ),
    }));
  },

  updateCompany: (companyId, updates) => {
    set(state => ({
      companies: state.companies.map(c =>
        c.id === companyId ? { ...c, ...updates } : c
      ),
    }));
  },

  endMeeting: (meetingId) => {
    set(state => ({
      meetings: state.meetings.map(m =>
        m.id === meetingId ? { ...m, endedAt: Date.now() } : m
      ),
      activeMeetingId: null,
    }));
  },

  nextQuarter: () => {
    set(state => ({
      currentQuarter: state.currentQuarter + 1,
    }));
  },

  setGameSpeed: (speed) => set({ gameSpeed: speed }),
  
  toggleRunning: () => set(state => ({ isRunning: !state.isRunning })),
  
  reset: () => set({
    companies: [],
    meetings: [],
    currentQuarter: 1,
    activeMeetingId: null,
    messages: [],
    isRunning: false,
    gameSpeed: 1,
  }),
}));
