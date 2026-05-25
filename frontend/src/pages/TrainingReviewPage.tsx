import { useEffect, useState } from 'react';
import { Home, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { agentApi } from '../api/agentApi';
import type { ReviewResponse } from '../types';

export default function TrainingReviewPage() {
  const setPage = useAppStore((s) => s.setPage);
  const currentSession = useAppStore((s) => s.currentSession);
  const memory = useAppStore((s) => s.memory);
  const addSession = useAppStore((s) => s.addSession);

  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentSession) {
      setPage('home');
      return;
    }

    const generateReview = async () => {
      try {
        const res = await agentApi.generateReview(currentSession, memory);
        setReview(res);

        // Update session with review data
        const updatedSession = {
          ...currentSession,
          summary: res.summary,
          keyJudgement: res.keyJudgement,
          nextSuggestion: res.nextSuggestion,
        };
        addSession(updatedSession);
      } catch (e) {
        console.error('Review generation failed:', e);
        setReview({
          summary: '训练已完成。',
          completionStatus: `${currentSession.completedExerciseCount} / ${currentSession.plannedExerciseCount} 个动作`,
          keyJudgement: '训练完成',
          nextSuggestion: '继续保持训练节奏。',
          exerciseSummaries: [],
          nextPlanUpdates: [],
        });
      } finally {
        setLoading(false);
      }
    };

    generateReview();
  }, [currentSession, memory]);

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

  if (!currentSession) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-6">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-shokz-black-900">训练复盘</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-shokz-orange border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Vela 正在生成复盘...</span>
        </div>
      ) : (
        <div className="px-5 pt-4 space-y-4">
          {/* Summary Card */}
          <div className="card bg-shokz-orange-pale border-none">
            <p className="text-sm text-gray-700 leading-relaxed">
              {review?.summary || '训练已完成。'}
            </p>
          </div>

          {/* Stats */}
          <div className="card">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-shokz-black-900">
                  {currentSession.completedExerciseCount} / {currentSession.plannedExerciseCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">动作完成</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-shokz-black-900">
                  {currentSession.durationMin || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">分钟</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-shokz-black-900">
                  {Math.round((currentSession.capacityKg || 0) / 100) / 10}k
                </p>
                <p className="text-xs text-gray-500 mt-0.5">总容量 kg</p>
              </div>
            </div>
          </div>

          {/* Key Judgement */}
          {review?.keyJudgement && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">关键判断</h2>
              <p className="text-sm text-gray-700">{review.keyJudgement}</p>
            </div>
          )}

          {/* Next Suggestion */}
          {review?.nextSuggestion && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">下次建议</h2>
              <p className="text-sm text-gray-700">{review.nextSuggestion}</p>
            </div>
          )}

          {/* Exercise Summaries */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">动作详情</h2>
            {currentSession.exercises.map((ex) => {
              const isExpanded = expandedExercises.has(ex.name);
              const completed = ex.completedSets.length;
              const planned = ex.plannedSets.length;
              const exCapacity = ex.completedSets.reduce((sum, s) => sum + s.actualWeightKg * s.actualReps, 0);
              const normalCount = ex.completedSets.filter(s => s.perceivedState === '正常').length;
              const stickyCount = ex.completedSets.filter(s => s.perceivedState === '粘滞').length;
              const easyCount = ex.completedSets.filter(s => s.perceivedState === '轻松').length;

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
                      {ex.completedSets.map((set, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">第 {set.setIndex} 组</span>
                          <span className="font-medium">{set.actualWeightKg}kg × {set.actualReps}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            set.perceivedState === '正常' ? 'bg-green-50 text-green-600' :
                            set.perceivedState === '轻松' ? 'bg-blue-50 text-blue-600' :
                            set.perceivedState === '粘滞' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {set.perceivedState}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-4">
            <button onClick={() => setPage('home')} className="btn-primary">
              <div className="flex items-center justify-center gap-2">
                <Home size={18} />
                返回首页
              </div>
            </button>
            <button onClick={() => setPage('calendar')} className="btn-secondary">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={18} />
                查看日历
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
