import { ChevronLeft, TrendingUp, Activity, Dumbbell } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { mockBodyMetrics, mockE1RM } from '../mock/data';
import BottomNav from '../components/BottomNav';

export default function PersonalDataPage() {
  const setPage = useAppStore((s) => s.setPage);
  const latest = mockBodyMetrics[mockBodyMetrics.length - 1];

  const bodyParts = [
    { name: '胸部力量', status: '优势项', color: 'text-green-600', bg: 'bg-green-50' },
    { name: '背部力量', status: '短板', color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: '肩部力量', status: '稳定', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: '手臂力量', status: '稳定', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: '腿部力量', status: '基础较好', color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <button onClick={() => setPage('home')} className="flex items-center gap-1 text-gray-500 mb-3">
          <ChevronLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <h1 className="text-xl font-bold text-shokz-black-900">个人数据</h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Body Trend */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-shokz-orange" />
            <h2 className="text-lg font-bold text-shokz-black-900">身体趋势</h2>
            <span className="text-xs text-gray-400 ml-auto">近 7 天</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-shokz-black-900">{latest.weightKg}</p>
              <p className="text-xs text-gray-500 mt-1">体重 kg</p>
              <p className="text-xs text-green-500 mt-0.5">+0.2</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-shokz-black-900">{latest.bodyFatPercent}%</p>
              <p className="text-xs text-gray-500 mt-1">体脂</p>
              <p className="text-xs text-green-500 mt-0.5">-0.2</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-shokz-black-900">{latest.muscleMassKg}</p>
              <p className="text-xs text-gray-500 mt-1">肌肉量 kg</p>
              <p className="text-xs text-green-500 mt-0.5">+0.2</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            体重小幅上升，同时肌肉量和训练表现都在提升，当前更接近稳定增肌趋势。
          </p>
        </div>

        {/* Strength Profile */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell size={18} className="text-shokz-orange" />
            <h2 className="text-lg font-bold text-shokz-black-900">力量画像</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            你的胸部力量是当前最稳定的优势项，卧推完成度不错；腿部力量基础较好，但最近缺少更新；背部力量是当前短板，建议下次优先补一次拉类训练。
          </p>
          <div className="space-y-2">
            {bodyParts.map((bp) => (
              <div key={bp.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-shokz-black-900">{bp.name}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${bp.bg} ${bp.color}`}>
                  {bp.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Training Quality */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-shokz-orange" />
            <h2 className="text-lg font-bold text-shokz-black-900">训练质量</h2>
            <span className="text-xs text-gray-400 ml-auto">近 7 天</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            这周你完成了 2 次训练，Push Day 表现比较稳定，卧推主项完成度不错，但后两组出现粘滞。Pull Day 暂时缺失，背部训练容量偏少。
          </p>
        </div>

        {/* Future Trend */}
        <div className="card">
          <h2 className="text-lg font-bold text-shokz-black-900 mb-3">下一阶段建议</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            如果保持当前每周 2-3 次训练频率，卧推可以先把 60kg × 8 的后两组从"粘滞"变成"正常"。在这个基础上，再考虑进入 62.5kg 的小幅加重。
          </p>
        </div>

        {/* e1RM */}
        <div className="card">
          <h2 className="text-lg font-bold text-shokz-black-900 mb-3">预测 1RM</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{mockE1RM.benchPress}</p>
              <p className="text-xs text-gray-500 mt-0.5">卧推 kg</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{mockE1RM.squat}</p>
              <p className="text-xs text-gray-500 mt-0.5">深蹲 kg</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-shokz-black-900">{mockE1RM.deadlift}</p>
              <p className="text-xs text-gray-500 mt-0.5">硬拉 kg</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
