import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, X, Camera } from "lucide-react";
import { calculateJourneyDay, getTodayInTimezone, getDateInTimezone } from "@/lib/dateUtils";
import type { DailyMacros } from "@shared/schema";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  goal: string;
  weight: number;
  goalWeight: number;
  programStartDate: string;
  onboardingCompleted: boolean;
  timezone?: string;
}

interface ClientUploadHistoryProps {
  clientId: string;
}

export default function ClientUploadHistory({ clientId }: ClientUploadHistoryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ day: number; data: DailyMacros } | null>(null);

  // Get client data for program start date
  const { data: client } = useQuery<Client>({
    queryKey: [`/api/trainer/client/${clientId}`],
    enabled: !!clientId,
  });

  // Get all daily macros for the current month for this client
  const { data: monthlyMacros = [] } = useQuery<DailyMacros[]>({
    queryKey: [`/api/trainer/client/${clientId}/daily-macros/month?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`],
    enabled: !!clientId,
  });

  const userTimezone = client?.timezone || 'America/New_York';
  const today = getTodayInTimezone(userTimezone);
  const programStartDate = client?.programStartDate;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayStatus = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = monthlyMacros.find(m => m.date === dateStr);
    
    // Check if this day is in the future (compare date strings in user's timezone)
    if (dateStr > today) {
      return { status: 'future', data: null };
    }
    
    // Check if data exists for this day (prioritize this check)
    if (dayData && dayData.screenshotUrl) {
      return { status: 'uploaded', data: dayData };
    }
    
    // Check if this day is before program start (only for dates without data)
    if (programStartDate) {
      const programStartString = getDateInTimezone(programStartDate, userTimezone);
      
      if (dateStr < programStartString) {
        return { status: 'before-program', data: null };
      }
    }
    
    // Day is within program dates but no upload
    return { status: 'missing', data: null };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'missing':
        return <X className="w-3 h-3 text-red-500" />;
      case 'future':
        return <Calendar className="w-3 h-3 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-green-900/30 border-green-600 text-white';
      case 'missing':
        return 'bg-red-900/30 border-red-600 text-white';
      case 'future':
        return 'bg-gray-800 border-gray-600 text-gray-500';
      case 'before-program':
        return 'bg-gray-900 border-gray-700 text-gray-600';
      default:
        return 'bg-gray-800 border-gray-600 text-white';
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (!client) {
    return <div className="text-white">Loading client data...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Client Info Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-semibold">
                {client.firstName[0]}{client.lastName[0]}
              </span>
            </div>
            <div>
              <span>{client.firstName} {client.lastName}</span>
              <p className="text-sm text-gray-400 font-normal">
                Day {programStartDate ? calculateJourneyDay(programStartDate, 'America/Los_Angeles') : 1} of Journey
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Calendar Navigation */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold text-white">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
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
                      {data.extractedCalories}cal
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
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
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
                {monthlyMacros.filter(m => m.screenshotUrl).length}
              </div>
              <div className="text-sm text-gray-400">Days Logged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500">
                {programStartDate ? calculateJourneyDay(programStartDate, 'America/Los_Angeles') : 1}
              </div>
              <div className="text-sm text-gray-400">Journey Day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Details Modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload Details - {currentDate.toLocaleDateString('en-US', { month: 'long' })} {selectedDay?.day}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay?.data && (
            <div className="space-y-4">
              {/* Screenshot Display */}
              {selectedDay.data.screenshotUrl && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-300">MyFitnessPal Screenshot</h4>
                  <div className="bg-gray-900 rounded-lg p-2">
                    <img 
                      src={`/${selectedDay.data.screenshotUrl}`}
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
                      {selectedDay.data.extractedCalories || 0}
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
              
              {/* Wellness Levels */}
              {(selectedDay.data.hungerLevel || selectedDay.data.energyLevel) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-300">Wellness Levels</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedDay.data.hungerLevel && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-1">Hunger Level</div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < selectedDay.data.hungerLevel! 
                                  ? 'bg-orange-500' 
                                  : 'bg-gray-600'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-white ml-2">
                            {selectedDay.data.hungerLevel}/5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedDay.data.energyLevel && (
                      <div className="bg-gray-900 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-1">Energy Level</div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < selectedDay.data.energyLevel! 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-600'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-white ml-2">
                            {selectedDay.data.energyLevel}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDay.data.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-300">Notes</h4>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-sm text-gray-300">{selectedDay.data.notes}</p>
                  </div>
                </div>
              )}
              
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