import { useState } from "react";
import TabNavigation from "@/components/TabNavigation";
import DashboardTab from "@/components/DashboardTab";
import WorkoutTab from "@/components/WorkoutTab";
import ChatTab from "@/components/ChatTab";
import ProgressTab from "@/components/ProgressTab";
import ScreenshotUploadTab from "@/components/ScreenshotUploadTab";
import { useAuth } from "@/hooks/useAuth";

export type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { user } = useAuth();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'nutrition':
        return <ScreenshotUploadTab />;
      case 'workout':
        return <WorkoutTab />;
      case 'chat':
        return <ChatTab />;
      case 'progress':
        return <ProgressTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-md mx-auto bg-dark min-h-screen relative">
        {/* Header */}
        <header className="px-6 py-4 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"} 
                alt="User profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Welcome!'}
                </div>
                <div className="text-sm text-gray-400">Day 1 of your journey</div>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <i className="fas fa-bell text-gray-400"></i>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="pb-20">
          {renderTabContent()}
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}
