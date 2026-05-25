import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, List, Repeat, Clock, Minus, Plus, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { agentApi } from '../api/agentApi';
import type { PerceivedState, SetRecord, TrainingPlan } from '../types';

function getAdjustmentNumber(adjustment: Record<string, unknown>, camelKey: string, snakeKey: string) {
  const value = adjustment[camelKey] ?? adjustment[snakeKey];
  return typeof value === 'number' ? value : undefined;
}

function applyActualAsNextSetBaseline(
  plannedSets: TrainingPlan['exercises'][number]['plannedSets'],
  currentSetIndex: number,
  actualWeightKg: number,
  actualReps: number
) {
  const nextSetIndex = currentSetIndex + 1;
  if (nextSetIndex >= plannedSets.length) {
    return plannedSets;
  }

  const updatedSets = [...plannedSets];
  updatedSets[nextSetIndex] = {
    ...updatedSets[nextSetIndex],
    plannedWeightKg: actualWeightKg,
    plannedReps: actualReps,
  };
  return updatedSets;
}

export default function ActiveTrainingPage() {
  const setPage = useAppStore((s) => s.setPage);
  const activePlan = useAppStore((s) => s.activePlan);
  const setCurrentSession = useAppStore((s) => s.setCurrentSession);
  const currentExerciseIndex = useAppStore((s) => s.currentExerciseIndex);
  const setCurrentExerciseIndex = useAppStore((s) => s.setCurrentExerciseIndex);
  const memory = useAppStore((s) => s.memory);
  const updateShortTermMemory = useAppStore((s) => s.updateShortTermMemory);
  const isResting = useAppStore((s) => s.isResting);
  const restSecondsRemaining = useAppStore((s) => s.restSecondsRemaining);
  const restEndsAt = useAppStore((s) => s.restEndsAt);
  const setResting = useAppStore((s) => s.setResting);
  const setRestSeconds = useAppStore((s) => s.setRestSeconds);
  const setRestEndsAt = useAppStore((s) => s.setRestEndsAt);
  const showAdjustmentModal = useAppStore((s) => s.showAdjustmentModal);
  const setShowAdjustmentModal = useAppStore((s) => s.setShowAdjustmentModal);
  const adjustmentMessage = useAppStore((s) => s.adjustmentMessage);
  const setAdjustmentMessage = useAppStore((s) => s.setAdjustmentMessage);
  const pendingAdjustment = useAppStore((s) => s.pendingAdjustment);
  const setPendingAdjustment = useAppStore((s) => s.setPendingAdjustment);
  const showFailureModal = useAppStore((s) => s.showFailureModal);
  const setShowFailureModal = useAppStore((s) => s.setShowFailureModal);
  const showReplaceModal = useAppStore((s) => s.showReplaceModal);
  const setShowReplaceModal = useAppStore((s) => s.setShowReplaceModal);

  const [perceivedState, setPerceivedState] = useState<PerceivedState>('正常');
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [actualReps, setActualReps] = useState<number>(0);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [editingWeightInput, setEditingWeightInput] = useState(false);
  const [weightInputValue, setWeightInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [failureType, setFailureType] = useState<string>('');
  const [failureNote, setFailureNote] = useState('');
  const [replaceStep, setReplaceStep] = useState(1);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endHoldProgress, setEndHoldProgress] = useState(0);
  const endHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exercise = activePlan?.exercises[currentExerciseIndex];
  const currentSet = exercise?.plannedSets[memory.shortTerm.currentSetIndex];
  const nextSet = exercise?.plannedSets[memory.shortTerm.currentSetIndex + 1];
  const nextExercise = activePlan?.exercises[currentExerciseIndex + 1];
  const restPreviewSet = isResting ? nextSet ?? nextExercise?.plannedSets[0] : currentSet;
  const restPreviewExerciseName = isResting && !nextSet ? nextExercise?.name : exercise?.name;

  const syncPlanAndSession = useCallback((updatedPlan: TrainingPlan) => {
    useAppStore.getState().setActivePlan(updatedPlan);

    const latestSession = useAppStore.getState().currentSession;
    if (latestSession) {
      setCurrentSession({
        ...latestSession,
        exercises: updatedPlan.exercises,
      });
    }
  }, [setCurrentSession]);

  const finishTraining = useCallback((planOverride?: TrainingPlan) => {
    const latestSession = useAppStore.getState().currentSession;
    const latestPlan = planOverride ?? useAppStore.getState().activePlan;
    if (!latestSession || !latestPlan) return;

    const endedAt = new Date().toISOString();
    const startTime = new Date(latestSession.startedAt);
    const endTime = new Date(endedAt);
    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    let capacityKg = 0;
    const updatedExercises = latestPlan.exercises.map(ex => {
      const exSets = ex.completedSets;
      if (exSets.length > 0) {
        capacityKg += exSets.reduce((sum, s) => sum + s.actualWeightKg * s.actualReps, 0);
      }
      return { ...ex, status: (ex.completedSets.length > 0 ? 'completed' : 'skipped') as import('../types').ExerciseStatus };
    });

    const completedCount = updatedExercises.filter(e => e.status === 'completed').length;
    const finalSession = {
      ...latestSession,
      endedAt,
      durationMin,
      capacityKg,
      completedExerciseCount: completedCount,
      exercises: updatedExercises,
    };

    useAppStore.getState().setActivePlan({ ...latestPlan, exercises: updatedExercises });
    setCurrentSession(finalSession);
    useAppStore.getState().addSession(finalSession);
    setPage('trainingReview');
  }, [setCurrentSession, setPage]);

  const clearEndHold = useCallback(() => {
    if (endHoldTimeoutRef.current) {
      clearTimeout(endHoldTimeoutRef.current);
      endHoldTimeoutRef.current = null;
    }
    if (endHoldIntervalRef.current) {
      clearInterval(endHoldIntervalRef.current);
      endHoldIntervalRef.current = null;
    }
    setEndHoldProgress(0);
  }, []);

  const requestEndConfirm = useCallback(() => {
    setResting(false);
    setRestSeconds(0);
    setRestEndsAt(null);
    setShowEndConfirm(true);
    clearEndHold();
  }, [clearEndHold, setRestEndsAt, setRestSeconds, setResting]);

  const startEndHold = useCallback(() => {
    clearEndHold();
    const holdMs = 1200;
    const startedAt = Date.now();

    endHoldIntervalRef.current = setInterval(() => {
      setEndHoldProgress(Math.min(100, ((Date.now() - startedAt) / holdMs) * 100));
    }, 40);

    endHoldTimeoutRef.current = setTimeout(() => {
      clearEndHold();
      setShowEndConfirm(false);
      finishTraining();
    }, holdMs);
  }, [clearEndHold, finishTraining]);

  useEffect(() => {
    if (currentSet) {
      setActualWeight(currentSet.plannedWeightKg);
      setActualReps(currentSet.plannedReps);
    }
  }, [currentSet]);

  const startEditingWeightInput = () => {
    setWeightInputValue(String(actualWeight));
    setEditingWeightInput(true);
  };

  const commitWeightInput = () => {
    const nextWeight = Number(weightInputValue);
    if (Number.isFinite(nextWeight) && nextWeight >= 0) {
      setActualWeight(Math.round(nextWeight * 100) / 100);
    }
    setEditingWeightInput(false);
  };

  const cancelWeightInput = () => {
    setEditingWeightInput(false);
    setWeightInputValue('');
  };

  useEffect(() => {
    if (!isResting || !restEndsAt) {
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestSeconds(remaining);
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 250);
    return () => clearInterval(timer);
  }, [isResting, restEndsAt, setRestSeconds]);

  useEffect(() => clearEndHold, [clearEndHold]);

  const handleFinishSet = async () => {
    if (!exercise || !currentSet || !activePlan) return;

    const setRecord: SetRecord = {
      setIndex: currentSet.setIndex,
      exerciseId: exercise.exerciseId,
      plannedWeightKg: currentSet.plannedWeightKg,
      plannedReps: currentSet.plannedReps,
      plannedRestSec: currentSet.plannedRestSec,
      actualWeightKg: actualWeight,
      actualReps: actualReps,
      perceivedState,
      restStartedAt: new Date().toISOString(),
      acceptedAgentAdjustment: true,
    };

    if (perceivedState === '失败') {
      setShowFailureModal(true);
      return;
    }

    setLoading(true);

    try {
      const res = await agentApi.adjustSet(setRecord, activePlan, memory);

      const newCompletedSets = [...exercise.completedSets, setRecord];
      const plannedSets = applyActualAsNextSetBaseline(
        exercise.plannedSets,
        memory.shortTerm.currentSetIndex,
        actualWeight,
        actualReps
      );
      const updatedExercises = [...activePlan.exercises];
      updatedExercises[currentExerciseIndex] = {
        ...exercise,
        plannedSets,
        completedSets: newCompletedSets,
        status: newCompletedSets.length >= exercise.plannedSets.length ? 'completed' : 'active',
      };

      const updatedPlan = { ...activePlan, exercises: updatedExercises };
      syncPlanAndSession(updatedPlan);

      if (res.adjustment) {
        setAdjustmentMessage(res.agentMessage);
        setPendingAdjustment(res.adjustment);
        setShowAdjustmentModal(true);
        updateShortTermMemory({
          consecutiveEasySets: perceivedState === '轻松' ? memory.shortTerm.consecutiveEasySets + 1 : 0,
          consecutiveStickySets: perceivedState === '粘滞' ? memory.shortTerm.consecutiveStickySets + 1 : 0,
        });
      } else {
        updateShortTermMemory({
          consecutiveEasySets: perceivedState === '轻松' ? memory.shortTerm.consecutiveEasySets + 1 : 0,
          consecutiveStickySets: perceivedState === '粘滞' ? memory.shortTerm.consecutiveStickySets + 1 : 0,
        });
        startRestTimer(currentSet.plannedRestSec);
      }
    } catch (e) {
      console.error('Adjust set failed:', e);
      startRestTimer(currentSet.plannedRestSec);
    } finally {
      setLoading(false);
    }
  };

  const startRestTimer = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    setRestSeconds(safeSeconds);
    setRestEndsAt(Date.now() + safeSeconds * 1000);
    setResting(true);
  };

  const moveToNextSet = useCallback((planOverride?: TrainingPlan) => {
    const latestPlan = planOverride ?? useAppStore.getState().activePlan;
    const setIndex = useAppStore.getState().memory.shortTerm.currentSetIndex;
    const exerciseIndex = useAppStore.getState().currentExerciseIndex;
    const activeExercise = latestPlan?.exercises[exerciseIndex];
    if (!latestPlan || !activeExercise) return;

    const nextSetIndex = setIndex + 1;

    if (nextSetIndex >= activeExercise.plannedSets.length) {
      const updatedExercises = [...latestPlan.exercises];
      updatedExercises[exerciseIndex] = {
        ...activeExercise,
        status: 'completed' as const,
      };
      const updatedPlan = { ...latestPlan, exercises: updatedExercises };
      syncPlanAndSession(updatedPlan);

      const nextExerciseIndex = exerciseIndex + 1;
      if (nextExerciseIndex >= updatedPlan.exercises.length) {
        requestEndConfirm();
        return;
      }

      setCurrentExerciseIndex(nextExerciseIndex);
      updateShortTermMemory({
        currentExerciseId: updatedPlan.exercises[nextExerciseIndex].id,
        currentSetIndex: 0,
        consecutiveEasySets: 0,
        consecutiveStickySets: 0,
        hasFailureInCurrentExercise: false,
      });
    } else {
      updateShortTermMemory({
        currentSetIndex: nextSetIndex,
      });
    }

    setPerceivedState('正常');
    setResting(false);
    setRestSeconds(0);
    setRestEndsAt(null);
  }, [requestEndConfirm, setCurrentExerciseIndex, setRestEndsAt, setRestSeconds, setResting, syncPlanAndSession, updateShortTermMemory]);

  const moveToNextExercise = useCallback((planOverride?: TrainingPlan) => {
    const latestPlan = planOverride ?? useAppStore.getState().activePlan;
    const exerciseIndex = useAppStore.getState().currentExerciseIndex;
    const activeExercise = latestPlan?.exercises[exerciseIndex];
    if (!latestPlan || !activeExercise) return;

    const updatedExercises = [...latestPlan.exercises];
    updatedExercises[exerciseIndex] = {
      ...activeExercise,
      status: activeExercise.completedSets.length > 0 ? 'completed' : 'skipped',
    };
    const updatedPlan = { ...latestPlan, exercises: updatedExercises };
    syncPlanAndSession(updatedPlan);

    const nextExerciseIndex = exerciseIndex + 1;
    if (nextExerciseIndex >= updatedPlan.exercises.length) {
      requestEndConfirm();
      return;
    }

    setCurrentExerciseIndex(nextExerciseIndex);
    updateShortTermMemory({
      currentExerciseId: updatedPlan.exercises[nextExerciseIndex].id,
      currentSetIndex: 0,
      consecutiveEasySets: 0,
      consecutiveStickySets: 0,
      hasFailureInCurrentExercise: false,
    });
    setPerceivedState('正常');
    setResting(false);
    setRestSeconds(0);
    setRestEndsAt(null);
  }, [requestEndConfirm, setCurrentExerciseIndex, setRestEndsAt, setRestSeconds, setResting, syncPlanAndSession, updateShortTermMemory]);

  useEffect(() => {
    if (restSecondsRemaining === 0 && isResting) {
      moveToNextSet();
    }
  }, [restSecondsRemaining, isResting, moveToNextSet]);

  const handleAcceptAdjustment = () => {
    const latestPlan = useAppStore.getState().activePlan;
    const latestExerciseIndex = useAppStore.getState().currentExerciseIndex;
    const latestSetIndex = useAppStore.getState().memory.shortTerm.currentSetIndex;
    const latestExercise = latestPlan?.exercises[latestExerciseIndex];

    if (pendingAdjustment && latestPlan && latestExercise && currentSet) {
      const adj = pendingAdjustment;
      const updatedExercises = [...latestPlan.exercises];
      const currentPlannedSets = [...latestExercise.plannedSets];
      const nextSetIdx = latestSetIndex + 1;
      const newWeightKg = getAdjustmentNumber(adj, 'newWeightKg', 'new_weight_kg');
      const newReps = getAdjustmentNumber(adj, 'newReps', 'new_reps');
      const newRestSec = getAdjustmentNumber(adj, 'newRestSec', 'new_rest_sec');

      if (nextSetIdx < currentPlannedSets.length) {
        currentPlannedSets[nextSetIdx] = {
          ...currentPlannedSets[nextSetIdx],
          plannedWeightKg: newWeightKg ?? currentPlannedSets[nextSetIdx].plannedWeightKg,
          plannedReps: newReps ?? currentPlannedSets[nextSetIdx].plannedReps,
          plannedRestSec: newRestSec ?? currentPlannedSets[nextSetIdx].plannedRestSec,
        };
      }

      updatedExercises[latestExerciseIndex] = {
        ...latestExercise,
        plannedSets: currentPlannedSets,
      };

      syncPlanAndSession({
        ...latestPlan,
        exercises: updatedExercises,
        agentAdjustments: [
          ...latestPlan.agentAdjustments,
          {
            exerciseId: latestExercise.exerciseId,
            afterSetIndex: currentSet.setIndex,
            appliedToSetIndex: nextSetIdx < currentPlannedSets.length ? currentPlannedSets[nextSetIdx].setIndex : null,
            adjustment: adj,
            appliedAt: new Date().toISOString(),
          },
        ],
      });
    }

    setShowAdjustmentModal(false);
    setPendingAdjustment(null);
    startRestTimer(getAdjustmentNumber(pendingAdjustment ?? {}, 'newRestSec', 'new_rest_sec') ?? currentSet?.plannedRestSec ?? 150);
  };

  const handleRejectAdjustment = () => {
    setShowAdjustmentModal(false);
    setPendingAdjustment(null);
    startRestTimer(currentSet?.plannedRestSec ?? 150);
  };

  const handleEndTraining = () => {
    requestEndConfirm();
  };

  const handleFailureSubmit = async () => {
    if (!failureType || !exercise || !currentSet || !activePlan) return;

    setLoading(true);
    const setRecord: SetRecord = {
      setIndex: currentSet.setIndex,
      exerciseId: exercise.exerciseId,
      plannedWeightKg: currentSet.plannedWeightKg,
      plannedReps: currentSet.plannedReps,
      plannedRestSec: currentSet.plannedRestSec,
      actualWeightKg: actualWeight,
      actualReps: actualReps,
      perceivedState: '失败',
      failureType: failureType as any,
      freeTextNote: failureNote,
      restStartedAt: new Date().toISOString(),
      acceptedAgentAdjustment: true,
    };

    try {
      const res = await agentApi.handleFailure(failureType, setRecord, activePlan, memory);

      const newCompletedSets = [...exercise.completedSets, setRecord];
      const plannedSets = applyActualAsNextSetBaseline(
        exercise.plannedSets,
        memory.shortTerm.currentSetIndex,
        actualWeight,
        actualReps
      );
      const updatedExercises = [...activePlan.exercises];
      updatedExercises[currentExerciseIndex] = {
        ...exercise,
        plannedSets,
        completedSets: newCompletedSets,
        status: newCompletedSets.length >= exercise.plannedSets.length ? 'completed' : 'active',
      };

      const updatedPlan = { ...activePlan, exercises: updatedExercises };
      syncPlanAndSession(updatedPlan);

      updateShortTermMemory({
        hasFailureInCurrentExercise: true,
        consecutiveEasySets: 0,
        consecutiveStickySets: 0,
      });

      setShowFailureModal(false);
      setFailureType('');
      setFailureNote('');

      if (res.shouldEndExercise) {
        moveToNextExercise(updatedPlan);
      } else if (res.adjustment) {
        setAdjustmentMessage(res.agentMessage);
        setPendingAdjustment(res.adjustment);
        setShowAdjustmentModal(true);
      } else {
        startRestTimer(currentSet.plannedRestSec + 60);
      }
    } catch (e) {
      console.error('Failure handling failed:', e);
      setShowFailureModal(false);
      startRestTimer(currentSet.plannedRestSec + 60);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipRest = () => {
    setResting(false);
    setRestEndsAt(null);
    moveToNextSet();
  };

  const handleExtendRest = (seconds: number) => {
    const currentDeadline = useAppStore.getState().restEndsAt ?? Date.now() + restSecondsRemaining * 1000;
    const nextDeadline = Math.max(Date.now(), currentDeadline + seconds * 1000);
    setRestEndsAt(nextDeadline);
    setRestSeconds(Math.max(0, Math.ceil((nextDeadline - Date.now()) / 1000)));
  };

  if (!exercise || !currentSet) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  const states: PerceivedState[] = ['过轻', '轻松', '正常', '粘滞', '失败'];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
        <button onClick={() => setPage('todayPlan')} className="flex items-center gap-1 text-gray-500">
          <ChevronLeft size={20} />
          <span className="text-sm">计划</span>
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-shokz-black-900">
            {exercise.name}｜{exercise.role === 'main' ? '主项' : exercise.role === 'secondary' ? '辅项' : '孤立'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            第 {memory.shortTerm.currentSetIndex + 1} / {exercise.plannedSets.length} 组
          </p>
        </div>
        <button
          onClick={handleEndTraining}
          className="text-sm text-gray-400 hover:text-shokz-orange transition-colors"
        >
          结束
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-5 pt-6 pb-4 flex flex-col">
        {/* Current / Next Set Plan */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400 mb-2">
            {isResting ? nextSet ? '下组计划' : '下个动作' : '本组计划'}
          </p>
          <button
            onClick={() => setShowWeightEditor(true)}
            disabled={isResting}
            className="text-5xl font-bold text-shokz-black-900 hover:text-shokz-orange transition-colors"
          >
            {isResting && restPreviewSet ? `${restPreviewSet.plannedWeightKg}kg × ${restPreviewSet.plannedReps}` : `${actualWeight}kg × ${actualReps}`}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {isResting
              ? restPreviewSet
                ? `休息结束后进入${restPreviewExerciseName ? `「${restPreviewExerciseName}」` : ''}第 ${restPreviewSet.setIndex} 组`
                : '休息结束后进入下一个动作'
              : '点击修改实际完成'}
          </p>
        </div>

        {/* Weight Editor Modal */}
        {showWeightEditor && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-5">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs">
              <h3 className="text-lg font-bold text-shokz-black-900 mb-5 text-center">实际完成</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">重量</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActualWeight(Math.max(0, actualWeight - 1.25))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Minus size={14} />
                    </button>
                    {editingWeightInput ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.25"
                        value={weightInputValue}
                        onChange={(e) => setWeightInputValue(e.target.value)}
                        onBlur={commitWeightInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitWeightInput();
                          if (e.key === 'Escape') cancelWeightInput();
                        }}
                        className="w-20 rounded-xl border border-shokz-orange px-2 py-1 text-center text-xl font-bold outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onDoubleClick={startEditingWeightInput}
                        className="w-20 text-center text-xl font-bold text-shokz-black-900"
                      >
                        {actualWeight}kg
                      </button>
                    )}
                    <button onClick={() => setActualWeight(actualWeight + 1.25)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">次数</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActualReps(Math.max(0, actualReps - 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Minus size={14} />
                    </button>
                    <span className="text-xl font-bold w-12 text-center">{actualReps}</span>
                    <button onClick={() => setActualReps(actualReps + 1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (editingWeightInput) commitWeightInput();
                  setShowWeightEditor(false);
                }}
                className="btn-primary mt-6"
              >
                确认
              </button>
            </div>
          </div>
        )}

        {/* Perceived State */}
        {!isResting && (
          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-3 text-center">体感</p>
            <div className="flex justify-between items-center px-2">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => setPerceivedState(state)}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    perceivedState === state
                      ? 'scale-110'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                      state === '正常'
                        ? 'bg-shokz-orange text-white'
                        : state === '过轻'
                        ? 'bg-green-100 text-green-600'
                        : state === '轻松'
                        ? 'bg-blue-100 text-blue-600'
                        : state === '粘滞'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {state === '正常' ? '✓' : state[0]}
                  </div>
                  <span className={`text-xs font-medium ${
                    perceivedState === state ? 'text-shokz-black-900' : 'text-gray-400'
                  }`}>
                    {state}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rest Timer */}
        {isResting && (
          <div className="flex-1 flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <Clock size={18} />
              <span className="text-sm">休息中</span>
            </div>
            <div className="text-7xl font-bold text-shokz-black-900 tabular-nums">
              {formatTime(restSecondsRemaining)}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleExtendRest(-30)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 font-medium active:scale-95"
              >
                -30秒
              </button>
              <button
                onClick={() => handleExtendRest(30)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 font-medium active:scale-95"
              >
                +30秒
              </button>
            </div>
          </div>
        )}

        {/* Primary Action */}
        <div className="mt-auto mb-4">
          {isResting ? (
            <button
              onClick={handleSkipRest}
              className="btn-secondary"
            >
              提前结束休息
            </button>
          ) : (
            <button
              onClick={handleFinishSet}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '处理中...' : '完成'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-5 pb-6 flex items-center justify-between">
        <button
          onClick={() => setPage('todayPlan')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-shokz-orange transition-colors"
        >
          <List size={16} />
          查看计划
        </button>
        <button
          onClick={() => {
            setReplaceStep(1);
            setShowReplaceModal(true);
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-shokz-orange transition-colors"
        >
          <Repeat size={16} />
          替换动作
        </button>
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="text-lg font-bold text-shokz-black-900">调参建议</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {adjustmentMessage}
            </p>
            <div className="space-y-2">
              <button onClick={handleAcceptAdjustment} className="btn-primary">
                接受建议
              </button>
              <button onClick={handleRejectAdjustment} className="w-full py-3 rounded-2xl text-sm text-gray-500 font-medium hover:bg-gray-50">
                保持原计划
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Training Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="text-lg font-bold text-shokz-black-900">结束训练？</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              当前训练会立刻进入复盘，未完成的动作会记录为跳过。
            </p>
            <button
              onPointerDown={startEndHold}
              onPointerUp={clearEndHold}
              onPointerLeave={clearEndHold}
              onPointerCancel={clearEndHold}
              className="relative w-full overflow-hidden rounded-2xl bg-red-500 py-4 text-base font-semibold text-white active:scale-[0.98] transition-transform"
            >
              <span
                className="absolute inset-y-0 left-0 bg-red-700/35 transition-[width] duration-75"
                style={{ width: `${endHoldProgress}%` }}
              />
              <span className="relative">长按确认结束</span>
            </button>
            <button
              onClick={() => {
                clearEndHold();
                setShowEndConfirm(false);
              }}
              className="w-full py-3 mt-2 rounded-2xl text-sm text-gray-500 font-medium hover:bg-gray-50"
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-shokz-black-900 mb-4">这组失败属于哪种情况？</h3>
            <div className="space-y-2 mb-4">
              {['推不上去/没完成次数', '被压/需要保护', '疼痛/不适', '动作变形/主动放弃'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFailureType(type)}
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-all ${
                    failureType === type
                      ? 'bg-shokz-orange text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={failureNote}
              onChange={(e) => setFailureNote(e.target.value)}
              placeholder="其他情况（可选）"
              className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm mb-4 outline-none focus:border-shokz-orange"
            />
            <button
              onClick={handleFailureSubmit}
              disabled={!failureType || loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? '处理中...' : '确认'}
            </button>
          </div>
        </div>
      )}

      {/* Replace Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-shokz-black-900 mb-4">
              {replaceStep === 1 ? '调整原因' : '替换方案'}
            </h3>
            {replaceStep === 1 && (
              <div className="space-y-2 mb-4">
                {['器械被占', '做着不舒服', '换个类似动作', '结束这个动作'].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      if (reason === '结束这个动作') {
                        moveToNextExercise();
                        setShowReplaceModal(false);
                      } else {
                        setReplaceStep(2);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            )}
            {replaceStep === 2 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-500 mb-3">
                  建议替换为：{exercise.name === '卧推' ? '哑铃卧推' : '类似替代动作'}
                </p>
                {['按这个来', '换成其他', '自己说一句'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === '按这个来') {
                        // Apply replacement
                        moveToNextExercise();
                      }
                      setShowReplaceModal(false);
                    }}
                    className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setShowReplaceModal(false);
                setReplaceStep(1);
              }}
              className="w-full py-3 rounded-2xl text-sm text-gray-500 font-medium hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
