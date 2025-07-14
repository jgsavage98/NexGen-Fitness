import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import ExerciseUpload from "@/pages/ExerciseUpload";
import MeetYourCoach from "@/pages/MeetYourCoach";
import CoachBio from "@/pages/CoachBio";
import TrainerDashboard from "@/pages/TrainerDashboard";
import AISettings from "@/pages/AISettings";
import UserSwitcher from "@/components/UserSwitcher";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Simple auth token check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('url_auth_token');
    console.log('Auth state check:', { 
      hasStoredToken: !!storedToken,
      currentPath: window.location.pathname
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/coach-chassidy-bio" component={CoachBio} />
      <Route path="/landing" component={Landing} />
      {!isAuthenticated ? (
        <Route path="/" component={() => <UserSwitcher />} />
      ) : user?.id === 'coach_chassidy' ? (
        <>
          <Route path="/" component={TrainerDashboard} />
          <Route path="/trainer" component={TrainerDashboard} />
          <Route path="/ai-settings" component={AISettings} />
          <Route path="/admin/exercises" component={ExerciseUpload} />
        </>
      ) : user?.onboardingCompleted ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/coach" component={MeetYourCoach} />
          <Route path="/admin/exercises" component={ExerciseUpload} />
        </>
      ) : (
        <>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/" component={Onboarding} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignore Vite HMR connection errors in development
      if (process.env.NODE_ENV === 'development' && 
          (event.reason?.message?.includes('vite') || 
           event.reason?.message?.includes('WebSocket') ||
           event.reason?.message?.includes('HMR'))) {
        event.preventDefault();
        return;
      }
      
      // Log other errors but prevent them from being uncaught
      console.warn('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      // Ignore Vite HMR errors
      if (process.env.NODE_ENV === 'development' && 
          event.message?.includes('vite')) {
        event.preventDefault();
        return;
      }
      
      console.warn('Global error caught:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
