import { useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import BottomNav from '../components/BottomNav';
import type { WorkoutSession } from '../types';

export default function CalendarPage() {
  const setPage = useAppStore((s) => s.setPage);
  const calendarDays = useAppStore((s) => s.calendarDays);
  const trainingHistory = useAppStore((s) => s.trainingHistory);
  const setSelectedHistorySession = useAppStore((s) => s.setSelectedHistorySession);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const month = 5;
  const year = 2026;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const getCapacityColor = (capacity: number) => {
    if (capacity === 0) return 'bg-gray-100';
    if (capacity < 5000) return 'bg-shokz-orange/20';
    if (capacity < 10000) return 'bg-shokz-orange/40';
    if (capacity < 15000) return 'bg-shokz-orange/60';
    return 'bg-shokz-orange';
  };

  const getTextColor = (capacity: number) => {
    if (capacity === 0) return 'text-gray-400';
    if (capacity < 15000) return 'text-shokz-black-900';
    return 'text-white';
  };

  const selectedDay = selectedDate
    ? calendarDays.find(d => d.date === selectedDate)
    : null;

  const getFocusLabel = (focus: string) => {
    if (focus === 'push') return 'Push Day';
    if (focus === 'pull') return 'Pull Day';
    if (focus === 'legs') return 'Leg Day';
    return focus;
  };

  const getMainExerciseName = (session: NonNullable<typeof selectedDay>['session']) => {
    return session?.exercises.find((ex) => ex.role === 'main')?.name || session?.exercises[0]?.name || '-';
  };

  const openSessionDetail = (session?: WorkoutSession) => {
    if (!session) return;
    setSelectedHistorySession(session);
    setPage('sessionDetail');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <button onClick={() => setPage('home')} className="flex items-center gap-1 text-gray-500 mb-3">
          <ChevronLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-shokz-black-900">训练记录</h1>
          <span className="text-sm text-gray-400">2026年5月</span>
        </div>
      </header>

      <div className="px-5 pt-4">
        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `2026-05-${day.toString().padStart(2, '0')}`;
              const dayData = calendarDays.find(d => d.date === dateStr);
              const hasTraining = dayData?.hasTraining || false;
              const capacity = dayData?.capacityKg || 0;
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => hasTraining && setSelectedDate(isSelected ? null : dateStr)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all ${
                    hasTraining
                      ? `${getCapacityColor(capacity)} ${getTextColor(capacity)} font-bold`
                      : 'text-gray-400 hover:bg-gray-50'
                  } ${isSelected ? 'ring-2 ring-shokz-orange ring-offset-1' : ''}`}
                >
                  <span>{day}</span>
                  {hasTraining && (
                    <span className="text-[9px] mt-0.5 opacity-80">
                      {capacity >= 1000 ? `${(capacity / 1000).toFixed(1)}k` : capacity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay?.session && (
          <button
            onClick={() => openSessionDetail(selectedDay.session)}
            className="mt-4 card w-full text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} className="text-shokz-orange" />
                <h3 className="font-bold text-shokz-black-900">
                  {selectedDay.date.split('-')[1]}月{parseInt(selectedDay.date.split('-')[2])}日
                  ｜{getFocusLabel(selectedDay.session.focus)}
                </h3>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">训练容量</span>
                <p className="font-bold text-shokz-black-900">{Math.round(selectedDay.session.capacityKg || 0).toLocaleString()} kg</p>
              </div>
              <div>
                <span className="text-gray-400">完成动作</span>
                <p className="font-bold text-shokz-black-900">{selectedDay.session.completedExerciseCount} / {selectedDay.session.plannedExerciseCount}</p>
              </div>
              <div>
                <span className="text-gray-400">主项</span>
                <p className="font-bold text-shokz-black-900">{getMainExerciseName(selectedDay.session)}</p>
              </div>
              <div>
                <span className="text-gray-400">时长</span>
                <p className="font-bold text-shokz-black-900">{selectedDay.session.durationMin} 分钟</p>
              </div>
            </div>
            {selectedDay.session.summary && (
              <p className="text-sm text-gray-600 mt-3">{selectedDay.session.summary}</p>
            )}
          </button>
        )}

        {/* Recent History */}
        {trainingHistory.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">本次会话记录</h2>
            <div className="space-y-2">
              {trainingHistory.slice(-3).map(session => (
                <button
                  key={session.id}
                  onClick={() => openSessionDetail(session)}
                  className="card w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-shokz-black-900">
                        {getFocusLabel(session.focus)}
                      </p>
                      <p className="text-xs text-gray-400">{session.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-shokz-orange">
                        {Math.round((session.capacityKg || 0) / 100) / 10}k
                      </p>
                      <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                        {session.durationMin} 分钟
                        <ChevronRight size={13} />
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
