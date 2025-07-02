// API configuration for the mobile app
// Points to the same backend as the web app
const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev 
  ? 'http://192.168.68.67:5000' 
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