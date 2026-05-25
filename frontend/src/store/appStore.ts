import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Page, UserProfile, TrainingPlan, WorkoutSession, Memory,
  ShortTermMemory, CalendarDay, NegotiationState,
} from '../types';
import { mockUser, generateMockCalendar } from '../mock/data';

interface AppState {
  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // User
  userProfile: UserProfile;

  // Training Flow
  negotiation: NegotiationState;
  setNegotiation: (n: NegotiationState) => void;

  activePlan: TrainingPlan | null;
  setActivePlan: (plan: TrainingPlan | null) => void;

  currentSession: WorkoutSession | null;
  setCurrentSession: (session: WorkoutSession | null) => void;

  memory: Memory;
  updateShortTermMemory: (updates: Partial<ShortTermMemory>) => void;

  // Training State
  currentExerciseIndex: number;
  setCurrentExerciseIndex: (i: number) => void;

  isResting: boolean;
  restSecondsRemaining: number;
  restEndsAt: number | null;
  setResting: (v: boolean) => void;
  setRestSeconds: (s: number) => void;
  setRestEndsAt: (t: number | null) => void;

  // Modals
  showFailureModal: boolean;
  setShowFailureModal: (v: boolean) => void;
  showReplaceModal: boolean;
  setShowReplaceModal: (v: boolean) => void;
  showAdjustmentModal: boolean;
  setShowAdjustmentModal: (v: boolean) => void;
  adjustmentMessage: string;
  setAdjustmentMessage: (msg: string) => void;
  pendingAdjustment: Record<string, unknown> | null;
  setPendingAdjustment: (adj: Record<string, unknown> | null) => void;

  // History
  trainingHistory: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  calendarDays: CalendarDay[];
  selectedHistorySession: WorkoutSession | null;
  setSelectedHistorySession: (session: WorkoutSession | null) => void;

  // Reset for new session
  resetSession: () => void;
}

const initialShortTermMemory: ShortTermMemory = {
  currentSetIndex: 0,
  discomfort: [],
  consecutiveEasySets: 0,
  consecutiveStickySets: 0,
  hasFailureInCurrentExercise: false,
  currentExerciseReplaced: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      setPage: (page) => set({ currentPage: page }),

      userProfile: mockUser,

      negotiation: { step: 1, answers: {} },
      setNegotiation: (n) => set({ negotiation: n }),

      activePlan: null,
      setActivePlan: (plan) => set({ activePlan: plan }),

      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),

      memory: {
        shortTerm: { ...initialShortTermMemory },
        longTerm: [],
      },
      updateShortTermMemory: (updates) =>
        set((state) => ({
          memory: {
            ...state.memory,
            shortTerm: { ...state.memory.shortTerm, ...updates },
          },
        })),

      currentExerciseIndex: 0,
      setCurrentExerciseIndex: (i) => set({ currentExerciseIndex: i }),

      isResting: false,
      restSecondsRemaining: 0,
      restEndsAt: null,
      setResting: (v) => set({ isResting: v }),
      setRestSeconds: (s) => set({ restSecondsRemaining: s }),
      setRestEndsAt: (t) => set({ restEndsAt: t }),

      showFailureModal: false,
      setShowFailureModal: (v) => set({ showFailureModal: v }),
      showReplaceModal: false,
      setShowReplaceModal: (v) => set({ showReplaceModal: v }),
      showAdjustmentModal: false,
      setShowAdjustmentModal: (v) => set({ showAdjustmentModal: v }),
      adjustmentMessage: '',
      setAdjustmentMessage: (msg) => set({ adjustmentMessage: msg }),
      pendingAdjustment: null,
      setPendingAdjustment: (adj) => set({ pendingAdjustment: adj }),

      trainingHistory: [],
      addSession: (session) =>
        set((state) => ({
          trainingHistory: [
            ...state.trainingHistory.filter((item) => item.id !== session.id),
            session,
          ],
          calendarDays: state.calendarDays.some((day) => day.date === session.date)
            ? state.calendarDays.map((day) =>
                day.date === session.date
                  ? {
                      ...day,
                      hasTraining: true,
                      capacityKg: session.capacityKg || 0,
                      session,
                    }
                  : day
              )
            : [
                ...state.calendarDays,
                {
                  date: session.date,
                  hasTraining: true,
                  capacityKg: session.capacityKg || 0,
                  session,
                },
              ],
        })),
      calendarDays: generateMockCalendar(),
      selectedHistorySession: null,
      setSelectedHistorySession: (session) => set({ selectedHistorySession: session }),

      resetSession: () =>
        set({
          currentExerciseIndex: 0,
          isResting: false,
          restSecondsRemaining: 0,
          restEndsAt: null,
          showFailureModal: false,
          showReplaceModal: false,
          showAdjustmentModal: false,
          adjustmentMessage: '',
          pendingAdjustment: null,
          memory: {
            shortTerm: { ...initialShortTermMemory },
            longTerm: get().memory.longTerm,
          },
        }),
    }),
    {
      name: 'vela-app-storage',
      partialize: (state) => ({
        trainingHistory: state.trainingHistory,
        calendarDays: state.calendarDays,
        userProfile: state.userProfile,
      }),
    }
  )
);
