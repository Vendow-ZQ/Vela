export type Strategy = '稳' | '冲' | '保';
export type TrainingFocus = 'push' | 'pull' | 'legs';
export type PerceivedState = '过轻' | '轻松' | '正常' | '粘滞' | '失败';
export type FailureType = '推不上去/没完成次数' | '被压/需要保护' | '疼痛/不适' | '动作变形/主动放弃';
export type ExerciseRole = 'main' | 'secondary' | 'isolation' | 'finisher' | 'technique';
export type ExerciseStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'replaced';
export type Page = 'home' | 'personalData' | 'calendar' | 'negotiation' | 'todayPlan' | 'activeTraining' | 'trainingReview' | 'sessionDetail';

export interface UserProfile {
  id: string;
  name: string;
  goal: '增肌' | '减脂' | '塑形' | '增力' | '力形兼备' | '综合提升';
  heightCm: number;
  weightKg: number;
  trainingAgeMonths: number;
  injuryHistory: string[];
  weeklyTrainingTarget: number;
  preferredSplit: string;
}

export interface BodyMetric {
  date: string;
  weightKg: number;
  bodyFatPercent: number;
  muscleMassKg: number;
  source: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  role: ExerciseRole;
  equipment: string[];
  defaultSets: [number, number];
  defaultRepRange: [number, number];
  defaultRestSec: [number, number];
  replacements: string[];
  riskNotes?: string[];
}

export interface PlannedSet {
  setIndex: number;
  plannedWeightKg: number;
  plannedReps: number;
  plannedRestSec: number;
}

export interface SetRecord {
  setIndex: number;
  exerciseId: string;
  plannedWeightKg: number;
  plannedReps: number;
  plannedRestSec: number;
  actualWeightKg: number;
  actualReps: number;
  perceivedState: PerceivedState;
  failureType?: FailureType;
  freeTextNote?: string;
  restStartedAt?: string;
  restEndedAt?: string;
  acceptedAgentAdjustment: boolean;
  agentAdjustmentAfterSet?: AgentAdjustment;
}

export interface AgentAdjustment {
  type: string;
  newWeightKg?: number;
  newReps?: number;
  newRestSec?: number;
  reason: string;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  role: ExerciseRole;
  plannedSets: PlannedSet[];
  completedSets: SetRecord[];
  status: ExerciseStatus;
  todayFocus: string;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  status: 'draft' | 'active' | 'completed';
  structure: string;
  focus: TrainingFocus | string;
  strategy: Strategy;
  generatedFrom: Record<string, unknown>;
  exercises: ActiveExercise[];
  userOverrides: Record<string, unknown>[];
  agentAdjustments: Record<string, unknown>[];
  nextSessionUpdates: string[];
}

export interface WorkoutSession {
  id: string;
  userId: string;
  date: string;
  focus: TrainingFocus | string;
  startedAt: string;
  endedAt?: string;
  durationMin?: number;
  capacityKg?: number;
  plannedExerciseCount: number;
  completedExerciseCount: number;
  exercises: ActiveExercise[];
  summary?: string;
  keyJudgement?: string;
  nextSuggestion?: string;
}

export interface ShortTermMemory {
  currentExerciseId?: string;
  currentSetIndex: number;
  todayStrategy?: Strategy;
  userState?: string;
  availableTimeMin?: number;
  discomfort: string[];
  consecutiveEasySets: number;
  consecutiveStickySets: number;
  hasFailureInCurrentExercise: boolean;
  currentExerciseReplaced: boolean;
}

export interface LongTermMemory {
  id: string;
  type: 'preference' | 'performance' | 'risk' | 'feedback_calibration' | 'plan';
  content: string;
  relatedExerciseId?: string;
  relatedBodyPart?: string;
  updatedAt: string;
}

export interface Memory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory[];
}

export interface TrainingHistory {
  sessions: WorkoutSession[];
}

export interface NegotiationState {
  step: number;
  answers: Record<string, string>;
  strategy?: Strategy;
}

export interface CalendarDay {
  date: string;
  hasTraining: boolean;
  capacityKg: number;
  session?: WorkoutSession;
}

// Agent Response Types
export interface AdjustSetResponse {
  adjustment: Record<string, unknown> | null;
  agentMessage: string;
  nextSet?: PlannedSet;
}

export interface FailureResponse {
  adjustment: Record<string, unknown>;
  agentMessage: string;
  riskLevel: string;
  shouldEndExercise: boolean;
}

export interface ReplacementResponse {
  recommendation: Record<string, unknown>;
  agentMessage: string;
}

export interface ReviewResponse {
  summary: string;
  completionStatus: string;
  keyJudgement: string;
  nextSuggestion: string;
  exerciseSummaries: Record<string, unknown>[];
  nextPlanUpdates: string[];
}
