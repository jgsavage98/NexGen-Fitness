import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Handle 401 errors gracefully
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    throwOnError: false, // Prevent unhandled promise rejections
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
