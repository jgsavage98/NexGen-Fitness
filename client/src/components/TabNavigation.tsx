import { TabType } from "@/pages/Home";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard' as TabType, icon: 'fas fa-home', label: 'Home' },
    { id: 'workout' as TabType, icon: 'fas fa-dumbbell', label: 'Workout' },
    { id: 'chat' as TabType, icon: 'fas fa-comments', label: 'Coach' },
    { id: 'progress' as TabType, icon: 'fas fa-chart-line', label: 'Progress' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 z-40">
      <div className="max-w-md mx-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 px-4 text-center tab-btn ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <i className={`${tab.icon} text-xl mb-1 block`}></i>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
