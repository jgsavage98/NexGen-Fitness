import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function AuthSwitch() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Clear all local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies manually
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Force a hard refresh after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Switching accounts...</p>
      </div>
    </div>
  );
}