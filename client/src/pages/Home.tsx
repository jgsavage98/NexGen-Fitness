import { useState } from "react";
import TabNavigation from "@/components/TabNavigation";
import DashboardTab from "@/components/DashboardTab";
import WorkoutTab from "@/components/WorkoutTab";
import ChatTab from "@/components/ChatTab";
import ProgressTab from "@/components/ProgressTab";
import ScreenshotUploadTab from "@/components/ScreenshotUploadTab";
import ProfileSettings from "@/pages/ProfileSettings";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, User } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatJourneyDay, hasProgramStarted } from "@/lib/dateUtils";

export type TabType = 'dashboard' | 'nutrition' | 'workout' | 'chat' | 'progress';
export type ViewType = 'tabs' | 'profile-settings';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentView, setCurrentView] = useState<ViewType>('tabs');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'macro_approved' && message.userId === user?.id) {
      // Refresh relevant queries when macro targets are updated
      queryClient.invalidateQueries({ queryKey: ['/api/macro-targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      
      // Show the dashboard tab if they're on a restricted tab
      if (activeTab === 'nutrition' || activeTab === 'workout') {
        setActiveTab('dashboard');
      }
    }
  });

  // Get macro targets status for tab restrictions
  const today = new Date().toISOString().split('T')[0];
  const { data: macroTargets } = useQuery<any>({
    queryKey: [`/api/macro-targets?date=${today}`],
    retry: false,
  });

  // Get unread messages count for notification badge (already combines individual + group)
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/chat/unread-count'],
    retry: false,
    refetchInterval: 3000, // Refetch every 3 seconds to match chat message polling
    refetchIntervalInBackground: true,
  });

  const isPendingApproval = macroTargets?.status === 'pending_trainer_approval' || false;
  const totalUnreadCount = Number(unreadData?.count) || 0;

  // Mark messages as read when chat tab is opened
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/chat/mark-read', {});
    },
    onSuccess: () => {
      // Invalidate unread count query to refresh the badge
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      // Force immediate refetch to ensure badge updates
      queryClient.refetchQueries({ queryKey: ['/api/chat/unread-count'] });
    }
  });

  // Handle tab change and mark messages as read when opening chat
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'chat' && totalUnreadCount > 0) {
      markAsReadMutation.mutate();
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Clear the URL completely and redirect to Choose Account page
      window.history.replaceState({}, document.title, window.location.origin);
      window.location.href = window.location.origin;
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
              <button
                onClick={() => setCurrentView('profile-settings')}
                className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-primary-500 transition-all"
              >
                <img 
                  src={(user as any)?.profileImageUrl || "/john-profile.png"} 
                  alt="User profile" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              </button>
              <div>
                <div className="font-semibold">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Welcome!'}
                </div>
                <div className="text-sm text-gray-400">
                  {hasProgramStarted((user as any)?.programStartDate) 
                    ? formatJourneyDay((user as any)?.programStartDate, (user as any)?.timezone)
                    : "Ready to begin your journey"
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </Button>
              <img 
                src="/ignite-logo.png" 
                alt="Ignite" 
                className="h-24 w-auto"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="pb-20">
          {currentView === 'profile-settings' ? (
            <ProfileSettings onBack={() => setCurrentView('tabs')} />
          ) : (
            renderTabContent()
          )}
        </div>

        {/* Tab Navigation - only show when not in profile settings */}
        {currentView === 'tabs' && (
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            isPendingApproval={isPendingApproval}
            unreadCount={totalUnreadCount}
          />
        )}
      </div>
    </div>
  );
}
