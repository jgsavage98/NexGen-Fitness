import { TabType } from "@/pages/Home";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isPendingApproval?: boolean;
  unreadCount?: number;
}

export default function TabNavigation({ activeTab, onTabChange, isPendingApproval, unreadCount }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard' as TabType, icon: 'fas fa-home', label: 'Home', disabled: false },
    { id: 'nutrition' as TabType, icon: 'fas fa-camera', label: 'Nutrition', disabled: isPendingApproval },
    { id: 'workout' as TabType, icon: 'fas fa-dumbbell', label: 'Workout', disabled: isPendingApproval },
    { id: 'chat' as TabType, icon: 'fas fa-comments', label: 'Chat', disabled: false },
    { id: 'progress' as TabType, icon: 'fas fa-chart-line', label: 'Progress', disabled: isPendingApproval },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 z-40">
      <div className="max-w-md mx-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={`flex-1 py-3 px-4 text-center tab-btn relative ${
                activeTab === tab.id ? 'active' : ''
              } ${tab.disabled ? 'disabled' : ''}`}
            >
              <i className={`${tab.icon} text-xl mb-1 block ${
                tab.disabled ? 'text-gray-600' : ''
              }`}></i>
              <span className={`text-xs ${
                tab.disabled ? 'text-gray-600' : ''
              }`}>{tab.label}</span>
              {tab.id === 'chat' && Number(unreadCount) > 0 && (
                <span className="absolute -top-0.5 left-[30px] bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px] font-bold text-[10px]">
                  {Number(unreadCount) > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
