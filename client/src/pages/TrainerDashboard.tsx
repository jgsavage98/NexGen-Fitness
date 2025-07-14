import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function TrainerDashboard() {
  const { toast } = useToast();

  // Check if current user is authenticated
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trainer dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is authorized (coach_chassidy)
  if (!currentUser || currentUser.id !== 'coach_chassidy') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">Only Coach Chassidy can access this dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
        <p className="text-gray-400 mt-2">Welcome, Coach Chassidy!</p>
      </div>
    </div>
  );
}