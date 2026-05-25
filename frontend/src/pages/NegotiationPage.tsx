import { useState } from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { agentApi } from '../api/agentApi';
import type { TrainingFocus } from '../types';

export default function NegotiationPage() {
  const setPage = useAppStore((s) => s.setPage);
  const negotiation = useAppStore((s) => s.negotiation);
  const setNegotiation = useAppStore((s) => s.setNegotiation);
  const userProfile = useAppStore((s) => s.userProfile);
  const updateShortTermMemory = useAppStore((s) => s.updateShortTermMemory);
  const setActivePlan = useAppStore((s) => s.setActivePlan);

  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<TrainingFocus>('push');

  const currentStep = negotiation.step;
  const answers = negotiation.answers;

  const stepTitles = ['今日状态', '可训练时间', '不适/限制', '策略确认'];

  const handleSelect = async (value: string) => {
    const newAnswers = { ...answers, [`step_${currentStep}`]: value };

    if (currentStep >= 4) {
      // Final step - generate plan
      setLoading(true);
      try {
        const timeMap: Record<string, number> = {
          '30 分钟': 30, '45 分钟': 45, '60 分钟': 60,
        };
        const strategy = newAnswers.step_4 === '我想冲一下' ? '冲' :
          newAnswers.step_4 === '我想保守一点' ? '保' : '稳';

        const negotiationInput = {
          user_state: newAnswers.step_1,
          available_time_min: timeMap[newAnswers.step_2] || 45,
          discomfort: newAnswers.step_3 === '没有' ? [] : [newAnswers.step_3],
          strategy,
          focus: selectedFocus,
        };

        updateShortTermMemory({
          todayStrategy: strategy,
          userState: newAnswers.step_1,
          availableTimeMin: timeMap[newAnswers.step_2] || 45,
          discomfort: negotiationInput.discomfort as string[],
        });

        const res = await agentApi.generatePlan(userProfile, {
          shortTerm: {
            currentSetIndex: 0,
            todayStrategy: strategy,
            userState: newAnswers.step_1,
            availableTimeMin: timeMap[newAnswers.step_2] || 45,
            discomfort: negotiationInput.discomfort as string[],
            consecutiveEasySets: 0,
            consecutiveStickySets: 0,
            hasFailureInCurrentExercise: false,
            currentExerciseReplaced: false,
          },
          longTerm: [],
        }, negotiationInput);

        setActivePlan(res.plan);
        setPage('todayPlan');
      } catch (e) {
        console.error('Plan generation failed:', e);
        alert('计划生成失败，请重试');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Move to next step
    setNegotiation({ step: currentStep + 1, answers: newAnswers });
    setShowCustom(false);
    setCustomInput('');
  };

  const handleCustomSubmit = () => {
    if (!customInput.trim()) return;
    handleSelect(customInput.trim());
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return {
          question: '开始前先确认一下，今天身体状态怎么样？',
          options: ['轻松兴奋', '正常', '有点困 / 疲劳'],
          hasCustom: true,
        };
      case 2:
        return {
          question: '今天大概能练多久？我会根据时间压缩或展开课表。',
          options: ['30 分钟', '45 分钟', '60 分钟'],
          hasCustom: true,
        };
      case 3:
        return {
          question: '今天有没有哪里不舒服，或者需要避开的动作？',
          options: ['没有', '肩 / 肘 / 腕', '腰 / 髋 / 膝'],
          hasCustom: true,
        };
      case 4:
        const state = answers.step_1 || '正常';
        const timeStr = answers.step_2 || '45 分钟';
        const discomfort = answers.step_3 || '没有';
        const strategy = state.includes('轻松') ? '冲' :
          state.includes('困') || state.includes('疲劳') ? '保' : '稳';
        const focusLabel = selectedFocus === 'push' ? 'Push Day' : selectedFocus === 'pull' ? 'Pull Day' : 'Leg Day';
        const mainLift = selectedFocus === 'push' ? '卧推' : selectedFocus === 'pull' ? '高位下拉' : '腿举';
        return {
          question: `基于你今天状态${state}、可训练 ${timeStr}、${discomfort}，我建议今天走「${strategy}」：按 ${focusLabel} 推进，${mainLift} 做主项。`,
          options: ['按这个来', '我想冲一下', '我想保守一点'],
          hasCustom: true,
        };
      default:
        return { question: '', options: [], hasCustom: false };
    }
  };

  const content = getStepContent();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => currentStep > 1
          ? setNegotiation({ step: currentStep - 1, answers })
          : setPage('home')
        } className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-shokz-black-900">训练前协商</h1>
          <p className="text-xs text-gray-400">{stepTitles[currentStep - 1]}</p>
        </div>
        <span className="text-sm text-gray-400">{currentStep}/4</span>
      </header>

      {/* Step Indicator */}
      <div className="px-5 flex gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= currentStep ? 'bg-shokz-orange' : 'bg-gray-100'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="px-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-shokz-orange flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle size={16} className="text-white" />
          </div>
          <p className="text-lg font-medium text-shokz-black-900 leading-relaxed">
            {content.question}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 space-y-3">
        {currentStep === 4 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { value: 'push' as const, label: 'Push' },
              { value: 'pull' as const, label: 'Pull' },
              { value: 'legs' as const, label: 'Leg' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setSelectedFocus(item.value)}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all ${
                  selectedFocus === item.value
                    ? 'border-shokz-orange bg-shokz-orange-pale text-shokz-orange'
                    : 'border-gray-200 text-gray-500 hover:border-shokz-orange'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {content.options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={loading}
            className="w-full py-4 px-5 rounded-2xl border border-gray-200 text-left text-base font-medium
              hover:border-shokz-orange hover:bg-shokz-orange-pale transition-all active:scale-[0.98]
              disabled:opacity-50"
          >
            {option}
          </button>
        ))}

        {content.hasCustom && (
          <>
            {!showCustom ? (
              <button
                onClick={() => setShowCustom(true)}
                className="w-full py-4 px-5 rounded-2xl border border-dashed border-gray-300 text-left text-base
                  text-gray-500 hover:border-shokz-orange hover:text-shokz-orange transition-all"
              >
                自己说一句...
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="输入你的状态..."
                  className="flex-1 py-4 px-5 rounded-2xl border border-gray-200 text-base outline-none
                    focus:border-shokz-orange"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                />
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customInput.trim() || loading}
                  className="px-5 py-4 rounded-2xl bg-shokz-orange text-white font-medium
                    disabled:opacity-50 active:scale-[0.98]"
                >
                  确认
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-shokz-orange border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Vela 正在生成计划...</span>
          </div>
        </div>
      )}
    </div>
  );
}
