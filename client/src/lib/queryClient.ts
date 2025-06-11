import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token from localStorage
  const authToken = localStorage.getItem('url_auth_token');
  
  let headers: Record<string, string> = {};
  
  // Include auth token in cookie header if present
  if (authToken) {
    document.cookie = `auth_token=${authToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let body: BodyInit | undefined;

  if (data) {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData - browser will set it with boundary
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Get auth token from localStorage and set cookie
    const authToken = localStorage.getItem('url_auth_token');
    let headers: Record<string, string> = {};
    
    if (authToken) {
      document.cookie = `auth_token=${authToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
