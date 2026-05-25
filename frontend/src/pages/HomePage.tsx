import { Dumbbell, TrendingUp, ChevronRight, Activity } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import BottomNav from '../components/BottomNav';
import { mockBodyMetrics, mockE1RM } from '../mock/data';

export default function HomePage() {
  const setPage = useAppStore((s) => s.setPage);
  const userProfile = useAppStore((s) => s.userProfile);
  const latestMetric = mockBodyMetrics[mockBodyMetrics.length - 1];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-shokz-black-900">
              你好，{userProfile.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-shokz-orange-pale flex items-center justify-center">
            <Activity size={20} className="text-shokz-orange" />
          </div>
        </div>
      </header>

      <div className="px-5 space-y-4">
        {/* Agent Suggestion */}
        <div className="card bg-shokz-orange-pale border-none">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-shokz-orange flex items-center justify-center shrink-0 mt-0.5">
              <Dumbbell size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-shokz-black-900">今日建议</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                今天计划：<span className="font-semibold">Push Day</span>。建议先完成卧推主项，开始训练后我会根据你的状态调整。
              </p>
            </div>
          </div>
        </div>

        {/* Today Plan Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-shokz-black-900">今日计划</h2>
            <span className="text-xs font-medium px-2.5 py-1 bg-shokz-orange-pale text-shokz-orange rounded-full">
              Push Day
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-shokz-orange shrink-0" />
              主项：卧推
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              预计：45-60 分钟
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              重点：胸部主项 + 肩三头容量
            </div>
          </div>
        </div>

        {/* Body Metrics */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-shokz-black-900">身体数据</h2>
            <button
              onClick={() => setPage('personalData')}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-shokz-orange transition-colors"
            >
              详细 <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{latestMetric.weightKg}</p>
              <p className="text-xs text-gray-500 mt-0.5">体重 kg</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{latestMetric.bodyFatPercent}%</p>
              <p className="text-xs text-gray-500 mt-0.5">体脂</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{latestMetric.muscleMassKg}</p>
              <p className="text-xs text-gray-500 mt-0.5">肌肉量 kg</p>
            </div>
          </div>
        </div>

        {/* e1RM */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-shokz-orange" />
            <h2 className="text-lg font-bold text-shokz-black-900">预测 1RM</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-shokz-black-900">{mockE1RM.benchPress}</p>
              <p className="text-xs text-gray-500 mt-0.5">卧推 kg</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-shokz-black-900">{mockE1RM.squat}</p>
              <p className="text-xs text-gray-500 mt-0.5">深蹲 kg</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-shokz-black-900">{mockE1RM.deadlift}</p>
              <p className="text-xs text-gray-500 mt-0.5">硬拉 kg</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            useAppStore.getState().resetSession();
            setPage('negotiation');
          }}
          className="btn-primary mt-2"
        >
          开始训练
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
