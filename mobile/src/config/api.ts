// API configuration for the mobile app
// Points to the same backend as the web app
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' 
  : 'https://your-production-domain.com';

export const API_ENDPOINTS = {
  auth: {
    user: '/api/auth/user',
    availableUsers: '/api/auth/available-users',
  },
  macros: {
    daily: '/api/daily-macros',
    targets: '/api/macro-targets',
    upload: '/api/upload-macro-screenshot',
  },
  chat: {
    messages: '/api/chat/messages',
    unreadCount: '/api/chat/unread-count',
  },
  progress: {
    entries: '/api/progress-entries',
  },
  workout: {
    today: '/api/workout/today',
  },
};