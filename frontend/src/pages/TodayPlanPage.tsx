import { ChevronLeft, Play, Dumbbell, Clock, Target } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function TodayPlanPage() {
  const setPage = useAppStore((s) => s.setPage);
  const activePlan = useAppStore((s) => s.activePlan);
  const setActivePlan = useAppStore((s) => s.setActivePlan);
  const currentSession = useAppStore((s) => s.currentSession);
  const setCurrentSession = useAppStore((s) => s.setCurrentSession);
  const setCurrentExerciseIndex = useAppStore((s) => s.setCurrentExerciseIndex);
  const userProfile = useAppStore((s) => s.userProfile);
  const updateShortTermMemory = useAppStore((s) => s.updateShortTermMemory);

  const handleStartTraining = () => {
    if (!activePlan) return;

    if (currentSession) {
      setPage('activeTraining');
      return;
    }

    const now = new Date().toISOString();
    const session = {
      id: `session_${Date.now()}`,
      userId: userProfile.id,
      date: now.split('T')[0],
      focus: activePlan.focus,
      startedAt: now,
      plannedExerciseCount: activePlan.exercises.length,
      completedExerciseCount: 0,
      exercises: activePlan.exercises,
    };
    const exercises = activePlan.exercises.map((ex, idx) => ({
      ...ex,
      status: idx === 0 ? 'active' as const : ex.status,
    }));
    const activeSession = {
      ...session,
      exercises,
    };

    setActivePlan({ ...activePlan, exercises });
    setCurrentSession(activeSession);
    setCurrentExerciseIndex(0);
    updateShortTermMemory({
      currentExerciseId: activePlan.exercises[0]?.id,
      currentSetIndex: 0,
    });
    setPage('activeTraining');
  };

  const handleBack = () => {
    setPage(currentSession ? 'activeTraining' : 'negotiation');
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      main: '主项',
      secondary: '主要辅项',
      isolation: '孤立',
      finisher: '收尾',
      technique: '技术',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'main': return 'bg-shokz-orange text-white';
      case 'secondary': return 'bg-shokz-black-900 text-white';
      case 'isolation': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getFocusLabel = (focus?: string) => {
    if (focus === 'push') return 'Push Day';
    if (focus === 'pull') return 'Pull Day';
    if (focus === 'legs') return 'Leg Day';
    return focus || '';
  };

  const getExerciseCardClass = (status: string) => {
    if (status === 'completed') {
      return 'card border-green-200 bg-green-50';
    }
    if (status === 'active') {
      return 'card border-shokz-orange bg-shokz-orange-pale';
    }
    if (status === 'skipped') {
      return 'card border-gray-200 bg-gray-50 opacity-70';
    }
    return 'card';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <button onClick={handleBack} className="flex items-center gap-1 text-gray-500 mb-3">
          <ChevronLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-shokz-black-900">
              今日计划
              {activePlan?.strategy && (
                <span className={`ml-2 text-sm px-2.5 py-0.5 rounded-full font-medium ${
                  activePlan.strategy === '冲' ? 'bg-red-50 text-red-600' :
                  activePlan.strategy === '保' ? 'bg-blue-50 text-blue-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {activePlan.strategy}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {getFocusLabel(activePlan?.focus)}
            </p>
          </div>
        </div>
      </header>

      {/* Exercises */}
      <div className="px-5 pt-4 space-y-3">
        {activePlan?.exercises.map((ex, idx) => (
          <div key={ex.id} className={getExerciseCardClass(ex.status)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium w-5 ${ex.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  {idx + 1}
                </span>
                <h3 className={`font-bold ${ex.status === 'completed' ? 'text-green-800' : 'text-shokz-black-900'}`}>{ex.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleColor(ex.role)}`}>
                  {getRoleLabel(ex.role)}
                </span>
                {ex.status === 'completed' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-600 text-white">
                    已完成
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 ml-7">
              <div className="flex items-center gap-1">
                <Dumbbell size={14} />
                <span>{ex.plannedSets.length} 组 × {ex.plannedSets[0]?.plannedReps || 8} 次</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{Math.floor((ex.plannedSets[0]?.plannedRestSec || 120) / 60)} 分钟休息</span>
              </div>
            </div>

            {ex.todayFocus && (
              <div className="flex items-center gap-1 mt-2 ml-7 text-xs text-gray-400">
                <Target size={12} />
                <span>今日重点：{ex.todayFocus}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Start CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-[430px] mx-auto">
        <button
          onClick={handleStartTraining}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Play size={18} fill="white" />
          {currentSession ? '继续训练' : '开始训练'}
        </button>
      </div>
    </div>
  );
}
