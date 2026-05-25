import { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function SessionDetailPage() {
  const setPage = useAppStore((s) => s.setPage);
  const session = useAppStore((s) => s.selectedHistorySession);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExercise = (name: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">没有找到这次训练记录。</p>
          <button onClick={() => setPage('calendar')} className="btn-primary">
            返回日历
          </button>
        </div>
      </div>
    );
  }

  const dateLabel = new Date(`${session.date}T00:00:00`).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-6">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <button onClick={() => setPage('calendar')} className="flex items-center gap-1 text-gray-500 mb-3">
          <ChevronLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <h1 className="text-xl font-bold text-shokz-black-900">训练复盘</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Summary Card */}
        <div className="card bg-shokz-orange-pale border-none">
          <p className="text-sm text-gray-700 leading-relaxed">
            {session.summary || '这次训练已记录。'}
          </p>
        </div>

        {/* Stats */}
        <div className="card">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">
                {session.completedExerciseCount} / {session.plannedExerciseCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">动作完成</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">
                {session.durationMin || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">分钟</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">
                {Math.round((session.capacityKg || 0) / 100) / 10}k
              </p>
              <p className="text-xs text-gray-500 mt-0.5">总容量 kg</p>
            </div>
          </div>
        </div>

        {/* Key Judgement */}
        {session.keyJudgement && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">关键判断</h2>
            <p className="text-sm text-gray-700">{session.keyJudgement}</p>
          </div>
        )}

        {/* Next Suggestion */}
        {session.nextSuggestion && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">下次建议</h2>
            <p className="text-sm text-gray-700">{session.nextSuggestion}</p>
          </div>
        )}

        {/* Exercise Summaries */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">动作详情</h2>
          {session.exercises.length > 0 ? (
            session.exercises.map((ex) => {
              const isExpanded = expandedExercises.has(ex.name);
              const completed = ex.completedSets.length;
              const planned = ex.plannedSets.length;
              const exCapacity = ex.completedSets.reduce((sum, s) => sum + s.actualWeightKg * s.actualReps, 0);
              const normalCount = ex.completedSets.filter(s => s.perceivedState === '正常').length;
              const stickyCount = ex.completedSets.filter(s => s.perceivedState === '粘滞').length;
              const easyCount = ex.completedSets.filter(s => s.perceivedState === '轻松' || s.perceivedState === '过轻').length;

              return (
                <div key={ex.id} className="card">
                  <button
                    onClick={() => toggleExercise(ex.name)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-shokz-black-900">{ex.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {ex.role === 'main' ? '主项' : ex.role === 'secondary' ? '辅项' : '孤立'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{completed}/{planned} 组</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
                    <span>容量: {Math.round(exCapacity)} kg</span>
                    {normalCount > 0 && <span>正常 ×{normalCount}</span>}
                    {easyCount > 0 && <span className="text-blue-500">轻松 ×{easyCount}</span>}
                    {stickyCount > 0 && <span className="text-amber-500">粘滞 ×{stickyCount}</span>}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
                      {ex.completedSets.length > 0 ? (
                        ex.completedSets.map((set, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">第 {set.setIndex} 组</span>
                            <span className="font-medium">{set.actualWeightKg}kg × {set.actualReps}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              set.perceivedState === '正常' ? 'bg-green-50 text-green-600' :
                              set.perceivedState === '轻松' || set.perceivedState === '过轻' ? 'bg-blue-50 text-blue-600' :
                              set.perceivedState === '粘滞' ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {set.perceivedState}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">这条记录暂无逐组明细。</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="card border-dashed">
              <p className="text-sm text-gray-500">这条记录暂无逐组明细。</p>
              <p className="text-xs text-gray-400 mt-1">完成一次真实训练后，这里会显示动作、组数、重量、次数和体感。</p>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <button onClick={() => setPage('calendar')} className="btn-secondary">
            <div className="flex items-center justify-center gap-2">
              <Calendar size={18} />
              返回日历
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
