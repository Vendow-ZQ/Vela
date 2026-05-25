import type {
  UserProfile, Memory, TrainingPlan, SetRecord, WorkoutSession,
  AdjustSetResponse, FailureResponse, ReplacementResponse, ReviewResponse,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function convertKeys(value: unknown, convertKey: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convertKey));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        convertKey(key),
        convertKeys(item, convertKey),
      ])
    );
  }

  return value;
}

function toSnakeCase(value: unknown): JsonValue {
  return convertKeys(value, camelToSnake) as JsonValue;
}

function toCamelCase<T>(value: unknown): T {
  return convertKeys(value, snakeToCamel) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSnakeCase(body)),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return toCamelCase<T>(await res.json());
}

export const agentApi = {
  negotiate: (data: { step: number; userInput: string; previousAnswers: Record<string, string> }) =>
    post<{ nextQuestion: string; options: string[]; strategy?: string; agentMessage: string }>(
      '/api/agent/negotiation', data
    ),

  generatePlan: (userProfile: UserProfile, memory: Memory, negotiationInput: Record<string, unknown>) =>
    post<{ plan: TrainingPlan; agentMessage: string }>('/api/agent/plan', {
      userProfile,
      memory,
      negotiationInput,
    }),

  adjustSet: (setRecord: SetRecord, activePlan: TrainingPlan, memory: Memory) =>
    post<AdjustSetResponse>('/api/agent/adjust-set', {
      setRecord,
      activePlan,
      memory,
    }),

  handleFailure: (failureType: string, setRecord: SetRecord, activePlan: TrainingPlan, memory: Memory) =>
    post<FailureResponse>('/api/agent/handle-failure', {
      failureType,
      setRecord,
      activePlan,
      memory,
    }),

  handleReplacement: (reason: string, currentExercise: unknown, activePlan: TrainingPlan, memory: Memory) =>
    post<ReplacementResponse>('/api/agent/replacement', {
      reason,
      currentExercise,
      activePlan,
      memory,
    }),

  generateReview: (session: WorkoutSession, memory: Memory) =>
    post<ReviewResponse>('/api/agent/review', {
      session,
      memory,
    }),
};
