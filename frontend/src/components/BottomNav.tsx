import { Home, BarChart2, Calendar } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function BottomNav() {
  const currentPage = useAppStore((s) => s.currentPage);
  const setPage = useAppStore((s) => s.setPage);

  const items = [
    { page: 'home' as const, label: '首页', icon: Home },
    { page: 'personalData' as const, label: '数据', icon: BarChart2 },
    { page: 'calendar' as const, label: '记录', icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 max-w-[430px] mx-auto">
      <div className="flex justify-around items-center h-16 pb-safe">
        {items.map((item) => {
          const isActive = currentPage === item.page ||
            (item.page === 'home' && currentPage === 'activeTraining');
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full ${
                isActive ? 'text-shokz-orange' : 'text-gray-400'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
