import type { UserProfile, BodyMetric, Exercise, WorkoutSession, CalendarDay } from '../types';

export const mockUser: UserProfile = {
  id: 'user_001',
  name: 'Vendow',
  goal: '力形兼备',
  heightCm: 176,
  weightKg: 72.4,
  trainingAgeMonths: 18,
  injuryHistory: [],
  weeklyTrainingTarget: 3,
  preferredSplit: 'PPL',
};

export const mockBodyMetrics: BodyMetric[] = [
  { date: '2026-05-14', weightKg: 72.2, bodyFatPercent: 18.8, muscleMassKg: 56.6, source: 'mock' },
  { date: '2026-05-15', weightKg: 72.1, bodyFatPercent: 18.7, muscleMassKg: 56.7, source: 'mock' },
  { date: '2026-05-16', weightKg: 72.3, bodyFatPercent: 18.7, muscleMassKg: 56.7, source: 'mock' },
  { date: '2026-05-17', weightKg: 72.3, bodyFatPercent: 18.6, muscleMassKg: 56.8, source: 'mock' },
  { date: '2026-05-18', weightKg: 72.4, bodyFatPercent: 18.6, muscleMassKg: 56.8, source: 'mock' },
  { date: '2026-05-19', weightKg: 72.4, bodyFatPercent: 18.6, muscleMassKg: 56.8, source: 'mock' },
  { date: '2026-05-20', weightKg: 72.4, bodyFatPercent: 18.6, muscleMassKg: 56.8, source: 'mock' },
];

export const mockE1RM = {
  benchPress: 92.5,
  squat: 125,
  deadlift: 145,
};

export const exerciseLibrary: Exercise[] = [
  {
    id: 'bench_press',
    name: '卧推',
    category: 'push',
    primaryMuscles: ['胸部', '三角肌前束', '三头肌'],
    role: 'main',
    equipment: ['杠铃', '卧推架'],
    defaultSets: [3, 5],
    defaultRepRange: [5, 8],
    defaultRestSec: [120, 180],
    replacements: ['哑铃卧推', '器械推胸', '史密斯卧推', '上斜哑铃卧推'],
  },
  {
    id: 'incline_dumbbell_press',
    name: '上斜哑铃卧推',
    category: 'push',
    primaryMuscles: ['上胸', '三角肌前束'],
    role: 'secondary',
    equipment: ['哑铃', '上斜凳'],
    defaultSets: [3, 4],
    defaultRepRange: [8, 12],
    defaultRestSec: [90, 120],
    replacements: ['上斜器械推胸', '上斜史密斯卧推', '俯卧撑'],
  },
  {
    id: 'dumbbell_shoulder_press',
    name: '哑铃推肩',
    category: 'push',
    primaryMuscles: ['三角肌', '三头肌'],
    role: 'secondary',
    equipment: ['哑铃'],
    defaultSets: [3, 4],
    defaultRepRange: [8, 12],
    defaultRestSec: [90, 120],
    replacements: ['器械推肩', '杠铃推肩', '阿诺德推举'],
  },
  {
    id: 'lateral_raise',
    name: '侧平举',
    category: 'push',
    primaryMuscles: ['三角肌中束'],
    role: 'isolation',
    equipment: ['哑铃'],
    defaultSets: [3, 4],
    defaultRepRange: [12, 20],
    defaultRestSec: [60, 90],
    replacements: ['绳索侧平举', '器械侧平举', '直立划船'],
  },
  {
    id: 'triceps_pushdown',
    name: '三头下压',
    category: 'push',
    primaryMuscles: ['三头肌'],
    role: 'isolation',
    equipment: ['绳索器械'],
    defaultSets: [3, 4],
    defaultRepRange: [12, 20],
    defaultRestSec: [60, 90],
    replacements: ['绳索下压', '窄距卧推', '臂屈伸'],
  },
  {
    id: 'machine_chest_press',
    name: '器械推胸',
    category: 'push',
    primaryMuscles: ['胸部', '三头肌'],
    role: 'secondary',
    equipment: ['推胸器械'],
    defaultSets: [3, 4],
    defaultRepRange: [8, 12],
    defaultRestSec: [90, 120],
    replacements: ['哑铃卧推', '史密斯卧推', '俯卧撑'],
    riskNotes: ['肩部不适时降低幅度，优先控制动作路径'],
  },
  {
    id: 'cable_fly',
    name: '绳索夹胸',
    category: 'push',
    primaryMuscles: ['胸部'],
    role: 'isolation',
    equipment: ['龙门架'],
    defaultSets: [2, 4],
    defaultRepRange: [12, 20],
    defaultRestSec: [60, 90],
    replacements: ['蝴蝶机夹胸', '哑铃飞鸟', '俯卧撑'],
  },
  {
    id: 'lat_pulldown',
    name: '高位下拉',
    category: 'pull',
    primaryMuscles: ['背阔肌', '肱二头肌'],
    role: 'main',
    equipment: ['高位下拉器械'],
    defaultSets: [3, 5],
    defaultRepRange: [8, 12],
    defaultRestSec: [90, 150],
    replacements: ['引体向上', '坐姿划船', '单臂哑铃划船'],
  },
  {
    id: 'seated_row',
    name: '坐姿划船',
    category: 'pull',
    primaryMuscles: ['中背部', '背阔肌', '肱二头肌'],
    role: 'secondary',
    equipment: ['划船器械'],
    defaultSets: [3, 4],
    defaultRepRange: [8, 12],
    defaultRestSec: [90, 120],
    replacements: ['胸托划船', '单臂哑铃划船', '绳索划船'],
  },
  {
    id: 'leg_press',
    name: '腿举',
    category: 'legs',
    primaryMuscles: ['股四头肌', '臀部'],
    role: 'main',
    equipment: ['腿举机'],
    defaultSets: [3, 5],
    defaultRepRange: [8, 12],
    defaultRestSec: [120, 180],
    replacements: ['哈克深蹲', '史密斯深蹲', '保加利亚分腿蹲'],
    riskNotes: ['膝盖不适时减少深度，不锁死膝关节'],
  },
  {
    id: 'leg_curl',
    name: '腿弯举',
    category: 'legs',
    primaryMuscles: ['腘绳肌'],
    role: 'isolation',
    equipment: ['腿弯举器械'],
    defaultSets: [3, 4],
    defaultRepRange: [10, 15],
    defaultRestSec: [60, 90],
    replacements: ['罗马尼亚硬拉', '臀桥', '俯卧腿弯举'],
  },
];

function generateMockSession(date: string, focus: string, exercisesCompleted: number): WorkoutSession {
  const baseCapacity = focus === 'push' ? 12860 : focus === 'pull' ? 11200 : 13500;
  const factor = 0.7 + Math.random() * 0.5;
  const capacity = Math.round(baseCapacity * factor);
  const duration = 40 + Math.floor(Math.random() * 25);

  return {
    id: `session_${date}`,
    userId: 'user_001',
    date,
    focus,
    startedAt: `${date}T18:30:00`,
    endedAt: `${date}T19:${30 + Math.floor(duration % 60)}`,
    durationMin: duration,
    capacityKg: capacity,
    plannedExerciseCount: 5,
    completedExerciseCount: exercisesCompleted,
    exercises: [],
    summary: `${focus === 'push' ? 'Push' : focus === 'pull' ? 'Pull' : 'Leg'} Day 完成`,
    keyJudgement: '训练完成度不错',
    nextSuggestion: '继续保持当前节奏',
  };
}

export function generateMockCalendar(): CalendarDay[] {
  const days: CalendarDay[] = [];
  const trainingDates = [
    { date: '2026-05-05', focus: 'push', completed: 5 },
    { date: '2026-05-07', focus: 'pull', completed: 4 },
    { date: '2026-05-09', focus: 'legs', completed: 5 },
    { date: '2026-05-12', focus: 'push', completed: 5 },
    { date: '2026-05-14', focus: 'pull', completed: 3 },
    { date: '2026-05-16', focus: 'legs', completed: 4 },
    { date: '2026-05-18', focus: 'push', completed: 5 },
  ];

  for (let d = 1; d <= 31; d++) {
    const dateStr = `2026-05-${d.toString().padStart(2, '0')}`;
    const training = trainingDates.find(t => t.date === dateStr);
    if (training) {
      const session = generateMockSession(training.date, training.focus, training.completed);
      days.push({
        date: dateStr,
        hasTraining: true,
        capacityKg: session.capacityKg!,
        session,
      });
    } else {
      days.push({ date: dateStr, hasTraining: false, capacityKg: 0 });
    }
  }

  return days;
}
