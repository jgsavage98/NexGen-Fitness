import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, MessageSquare, TrendingUp, Dumbbell, Settings, LogOut, Bell, BarChart3, Heart, Zap, Target, Users, Brain } from "lucide-react";
import ProfileSettings from "@/pages/ProfileSettings";
import ClientUploadHistory from "@/components/ClientUploadHistory";
import ClientProgressTimeSeries from "@/components/ClientProgressTimeSeries";
import UnifiedChatTab from "@/components/UnifiedChatTab";
import ExerciseManagement from "@/components/ExerciseManagement";
import AISettings from "@/pages/AISettings";
import TrainerTabNavigation, { TrainerTabType } from "@/components/TrainerTabNavigation";
import { calculateJourneyDay } from "@/lib/dateUtils";


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
  unansweredCount?: number;
}

interface PendingMacroChange {
  id: number;
  userId: string;
  date: string;
  proposedCalories: number;
  proposedProtein: number;
  proposedCarbs: number;
  proposedFat: number;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  reasoning: string;
  requestDate: string;
  screenshotUrl: string;
  user: Client;
}

interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  user: Client;
}

interface PendingChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  status: string;
  originalAIResponse?: string;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
}

export default function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState<TrainerTabType>('overview');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState("");
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [selectedChatClient, setSelectedChatClient] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Activity filtering state
  const [activityClientFilter, setActivityClientFilter] = useState<string>("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
        <p className="text-gray-400 mt-2">Loading...</p>
      </div>
    </div>
  );
}