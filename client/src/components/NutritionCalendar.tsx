import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, X, Camera, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { calculateJourneyDay } from "@/lib/dateUtils";

interface DailyMacros {
  id: number;
  userId: string;
  date: string;
  screenshotUrl?: string;
  screenshot_url?: string; // Database field name
  extractedCalories?: number;
  extracted_calories?: number; // Database field name
  extractedProtein?: number;
  extractedCarbs?: number;
  extractedFat?: number;
  visionProcessedAt?: string;
}

interface NutritionCalendarProps {
  onBack?: () => void;
}

export default function NutritionCalendar({ onBack }: NutritionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ day: number; data: DailyMacros } | null>(null);
  const { user } = useAuth();

  // Get all daily macros for the current month
  const { data: monthlyMacros = [] } = useQuery<DailyMacros[]>({
    queryKey: [`/api/daily-macros/month?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`],
    retry: false,
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();
  const programStartDate = (user as any)?.programStartDate;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayStatus = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = monthlyMacros.find(m => m.date === dateStr);
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const programStart = programStartDate ? new Date(programStartDate) : null;
    
    // Check if this day is in the future
    if (dayDate > today) {
      return { status: 'future', data: null };
    }
    
    // Check if data exists for this day (prioritize this check)
    if (dayData && (dayData.screenshotUrl || dayData.screenshot_url)) {
      return { status: 'uploaded', data: dayData };
    }
    
    // Check if this day is before program start (only for dates without data)
    if (programStart) {
      const programStartDate = new Date(programStart.getFullYear(), programStart.getMonth(), programStart.getDate());
      const currentDayDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      
      if (currentDayDate < programStartDate) {
        return { status: 'before-program', data: null };
      }
    }
    
    // Day is within program dates but no upload
    return { status: 'missing', data: null };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missing':
        return <X className="w-4 h-4 text-red-500" />;
      case 'future':
        return <Calendar className="w-4 h-4 text-gray-500" />;
      case 'before-program':
        return <div className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-green-500/20 border-green-500/30 text-green-300';
      case 'missing':
        return 'bg-red-500/20 border-red-500/30 text-red-300';
      case 'future':
        return 'bg-gray-500/10 border-gray-500/20 text-gray-500';
      case 'before-program':
        return 'bg-gray-800 border-gray-700 text-gray-600';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-400';
    }
  };

  // Calculate calendar grid
  const calendarDays = [];
  
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center mb-6 relative">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute left-0 top-0 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <h1 className="text-2xl font-bold text-white mb-2">Upload History</h1>
        <p className="text-gray-400">Track your daily nutrition uploads</p>
      </div>

      {/* Calendar Navigation */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-white text-lg">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={index} className="aspect-square" />;
              }
              
              const { status, data } = getDayStatus(day);
              const isToday = day === today.getDate() && 
                           currentDate.getMonth() === today.getMonth() && 
                           currentDate.getFullYear() === today.getFullYear();
              
              return (
                <div
                  key={day}
                  className={`
                    aspect-square border rounded-lg flex flex-col items-center justify-center text-sm relative
                    ${getStatusColor(status)}
                    ${isToday ? 'ring-2 ring-primary-500' : ''}
                    ${status === 'uploaded' ? 'cursor-pointer hover:bg-green-800/40' : ''}
                  `}
                  onClick={() => {
                    if (status === 'uploaded' && data) {
                      setSelectedDay({ day, data });
                    }
                  }}
                >
                  <div className="font-medium">{day}</div>
                  <div className="absolute top-1 right-1">
                    {getStatusIcon(status)}
                  </div>
                  {data && (
                    <div className="text-xs text-center mt-1">
                      {(data.extractedCalories || data.extracted_calories)}cal
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-300">Upload completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-300">Upload missing</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-300">Future date</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {monthlyMacros.filter(m => m.screenshotUrl || m.screenshot_url).length}
              </div>
              <div className="text-sm text-gray-400">Days Logged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500">
                {programStartDate ? calculateJourneyDay(programStartDate, (user as any)?.timezone) : 1}
              </div>
              <div className="text-sm text-gray-400">Journey Day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Details Modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload Details - June {selectedDay?.day}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay?.data && (
            <div className="space-y-4">
              {/* Screenshot Display */}
              {(selectedDay.data.screenshotUrl || selectedDay.data.screenshot_url) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-300">MyFitnessPal Screenshot</h4>
                  <div className="bg-gray-900 rounded-lg p-2">
                    <img 
                      src={`/${selectedDay.data.screenshotUrl || selectedDay.data.screenshot_url}`}
                      alt="MyFitnessPal Screenshot"
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
              )}
              
              {/* Extracted Nutrition Data */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Extracted Nutrition</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {selectedDay.data.extractedCalories || selectedDay.data.extracted_calories || 0}
                    </div>
                    <div className="text-sm text-gray-400">Calories</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {selectedDay.data.extractedProtein || 0}g
                    </div>
                    <div className="text-sm text-gray-400">Protein</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-400">
                      {selectedDay.data.extractedCarbs || 0}g
                    </div>
                    <div className="text-sm text-gray-400">Carbs</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {selectedDay.data.extractedFat || 0}g
                    </div>
                    <div className="text-sm text-gray-400">Fat</div>
                  </div>
                </div>
              </div>
              
              {/* Additional Info */}
              {selectedDay.data.visionProcessedAt && (
                <div className="text-xs text-gray-500 text-center">
                  Processed: {new Date(selectedDay.data.visionProcessedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}