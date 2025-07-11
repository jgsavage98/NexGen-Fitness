import { TabType } from "@/pages/Home";
import { Home, Camera, Dumbbell, MessageCircle, TrendingUp } from "lucide-react";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isPendingApproval?: boolean;
  unreadCount?: number;
}

export default function TabNavigation({ activeTab, onTabChange, isPendingApproval, unreadCount }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard' as TabType, icon: Home, label: 'Home', disabled: false },
    { id: 'nutrition' as TabType, icon: Camera, label: 'Nutrition', disabled: isPendingApproval },
    { id: 'workout' as TabType, icon: Dumbbell, label: 'Workout', disabled: isPendingApproval },
    { id: 'chat' as TabType, icon: MessageCircle, label: 'Chat', disabled: false },
    { id: 'progress' as TabType, icon: TrendingUp, label: 'Progress', disabled: isPendingApproval },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 z-50 safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <div className="flex">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;
            
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                disabled={isDisabled}
                className={`flex-1 py-3 px-2 text-center relative transition-all duration-200 ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : isDisabled 
                      ? 'text-gray-600 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex flex-col items-center">
                  <IconComponent 
                    className={`w-6 h-6 mb-1 ${
                      isActive ? 'text-primary' : isDisabled ? 'text-gray-600' : 'text-current'
                    }`}
                  />
                  <span className={`text-xs font-medium ${
                    isActive ? 'text-primary' : isDisabled ? 'text-gray-600' : 'text-current'
                  }`}>
                    {tab.label}
                  </span>
                </div>
                
                {/* Chat notification badge */}
                {tab.id === 'chat' && Number(unreadCount) > 0 && (
                  <span className="absolute top-1 right-1/2 transform translate-x-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] font-bold text-[10px] shadow-lg">
                    {Number(unreadCount) > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
