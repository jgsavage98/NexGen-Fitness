import { TrendingUp, Settings, MessageSquare, Dumbbell, BarChart3, User, Calendar, Brain } from "lucide-react";

export type TrainerTabType = 'overview' | 'macro-reviews' | 'chat' | 'exercises' | 'client-progress' | 'client-setup' | 'client-history' | 'ai-settings';

interface TrainerTabNavigationProps {
  activeTab: TrainerTabType;
  onTabChange: (tab: TrainerTabType) => void;
  pendingReviewsCount?: number;
  chatUnreadCount?: number;
}

export default function TrainerTabNavigation({ 
  activeTab, 
  onTabChange, 
  pendingReviewsCount = 0,
  chatUnreadCount = 0
}: TrainerTabNavigationProps) {
  const tabs = [
    { id: 'overview' as TrainerTabType, icon: TrendingUp, label: 'Overview', disabled: false },
    { id: 'macro-reviews' as TrainerTabType, icon: Settings, label: 'Reviews', disabled: false, badge: pendingReviewsCount },
    { id: 'chat' as TrainerTabType, icon: MessageSquare, label: 'Chat', disabled: false, badge: chatUnreadCount },
    { id: 'exercises' as TrainerTabType, icon: Dumbbell, label: 'Exercises', disabled: false },
    { id: 'client-progress' as TrainerTabType, icon: BarChart3, label: 'Progress', disabled: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex pb-safe">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;
            const badgeCount = tab.badge || 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                disabled={isDisabled}
                className={`flex-1 py-4 px-2 text-center relative transition-all duration-200 ${
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
                
                {/* Notification badge */}
                {badgeCount > 0 && (
                  <span className="absolute top-1 right-1/2 transform translate-x-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] font-bold text-[10px] shadow-lg">
                    {badgeCount > 99 ? '99+' : badgeCount}
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