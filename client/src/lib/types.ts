export interface UserProfile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  goal?: 'weight-loss' | 'muscle-gain' | 'maintenance';
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  gender?: 'male' | 'female';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  injuries?: string[];
  equipment?: string[];
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment?: string;
  difficulty?: string;
  videoUrl?: string;
  imageUrl?: string;
  regressionId?: number;
  progressionId?: number;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  targetMuscles: string[];
  difficulty: string;
}

export interface Workout {
  id: number;
  userId: string;
  name: string;
  type?: string;
  targetMuscleGroups: string[];
  estimatedDuration?: number;
  difficulty?: string;
  exercises: WorkoutExercise[];
  completedAt?: string;
  createdAt: string;
}

export interface Meal {
  id: number;
  userId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  mealType?: string;
  loggedAt: string;
}

export interface MacroTarget {
  id: number;
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  isAI: boolean;
  metadata?: {
    isVoice?: boolean;
    duration?: number;
    confidence?: number;
    requiresHumanReview?: boolean;
    suggestedActions?: string[];
    fromCoach?: boolean;
    coachId?: string;
    hasPdfReport?: boolean;
    pdfUrl?: string;
    reportTitle?: string;
    pdfThumbnail?: boolean;
  };
  createdAt: string;
}

export interface ProgressEntry {
  id: number;
  userId: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  measurements?: Record<string, number>;
  photos?: string[];
  notes?: string;
  recordedAt: string;
}

export interface MacroSummary {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WorkoutSet {
  exerciseId: number;
  setNumber: number;
  reps: number;
  weight?: number;
  completed: boolean;
}

export interface VoiceRecording {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
}
