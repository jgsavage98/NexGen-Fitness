import { useState } from "react";
import TabNavigation from "@/components/TabNavigation";
import DashboardTab from "@/components/DashboardTab";
import WorkoutTab from "@/components/WorkoutTab";
import ChatTab from "@/components/ChatTab";
import ProgressTab from "@/components/ProgressTab";
import ScreenshotUploadTab from "@/components/ScreenshotUploadTab";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/landing");
    },
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab onTabChange={setActiveTab} />;
      case 'nutrition':
        return <ScreenshotUploadTab onTabChange={setActiveTab} />;
      case 'workout':
        return <WorkoutTab />;
      case 'chat':
        return <ChatTab />;
      case 'progress':
        return <ProgressTab />;
      default:
        return <DashboardTab onTabChange={setActiveTab} />;
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
                src="/john-profile.png" 
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
            <div className="flex items-center space-x-2">
              <img 
                src="/ignite-logo.png" 
                alt="Ignite" 
                className="h-8 w-auto"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
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
