/**
 * Training Types
 * 
 * Types for workout tracking, exercises, and sets
 */

export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'mobility' | 'sport' | 'other';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full_body' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  isCustom: boolean;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number; // seconds for cardio/timed exercises
  distance?: number; // meters for cardio
  rpe?: number; // Rate of Perceived Exertion 1-10
  notes?: string;
  isWarmup: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  restSeconds?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  type: WorkoutType;
  exercises: WorkoutExercise[];
  startedAt: string;
  endedAt?: string;
  duration?: number; // minutes
  totalVolume?: number; // total weight × reps
  notes?: string;
  feeling?: 'great' | 'good' | 'okay' | 'tired' | 'exhausted';
  isCompleted: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  type: WorkoutType;
  exercises: { exerciseId: string; targetSets: number; targetReps?: string; restSeconds?: number }[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TrainingStats {
  totalWorkouts: number;
  totalVolume: number;
  totalDuration: number;
  workoutsThisWeek: number;
  streakDays: number;
  favoriteExercise?: string;
  personalRecords: { exercise: string; weight: number; reps: number; date: string }[];
}

// ============================================================================
// Constants
// ============================================================================

export const WORKOUT_TYPE_CONFIG: Record<WorkoutType, { label: string; icon: string; color: string }> = {
  strength: { label: 'Strength', icon: '🏋️', color: '#ef4444' },
  cardio: { label: 'Cardio', icon: '🏃', color: '#3b82f6' },
  hiit: { label: 'HIIT', icon: '⚡', color: '#f97316' },
  yoga: { label: 'Yoga', icon: '🧘', color: '#a855f7' },
  mobility: { label: 'Mobility', icon: '🤸', color: '#22c55e' },
  sport: { label: 'Sport', icon: '⚽', color: '#06b6d4' },
  other: { label: 'Other', icon: '💪', color: '#64748b' },
};

export const MUSCLE_GROUP_CONFIG: Record<MuscleGroup, { label: string; icon: string }> = {
  chest: { label: 'Chest', icon: '🫁' },
  back: { label: 'Back', icon: '🔙' },
  shoulders: { label: 'Shoulders', icon: '💪' },
  arms: { label: 'Arms', icon: '💪' },
  legs: { label: 'Legs', icon: '🦵' },
  core: { label: 'Core', icon: '🎯' },
  full_body: { label: 'Full Body', icon: '🏋️' },
  cardio: { label: 'Cardio', icon: '❤️' },
};

export const PRESET_EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'chest', equipment: 'Barbell', isCustom: false },
  { id: 'incline-press', name: 'Incline Press', muscleGroup: 'chest', equipment: 'Barbell', isCustom: false },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', muscleGroup: 'chest', equipment: 'Dumbbells', isCustom: false },
  { id: 'push-ups', name: 'Push-ups', muscleGroup: 'chest', equipment: 'Bodyweight', isCustom: false },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroup: 'chest', equipment: 'Cable', isCustom: false },
  
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'back', equipment: 'Barbell', isCustom: false },
  { id: 'pull-ups', name: 'Pull-ups', muscleGroup: 'back', equipment: 'Bodyweight', isCustom: false },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'Cable', isCustom: false },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'Barbell', isCustom: false },
  { id: 'dumbbell-row', name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'Dumbbells', isCustom: false },
  
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'Barbell', isCustom: false },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'Dumbbells', isCustom: false },
  { id: 'front-raise', name: 'Front Raise', muscleGroup: 'shoulders', equipment: 'Dumbbells', isCustom: false },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'Cable', isCustom: false },
  
  // Arms
  { id: 'bicep-curl', name: 'Bicep Curl', muscleGroup: 'arms', equipment: 'Dumbbells', isCustom: false },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'arms', equipment: 'Dumbbells', isCustom: false },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'Cable', isCustom: false },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'arms', equipment: 'Barbell', isCustom: false },
  { id: 'dips', name: 'Dips', muscleGroup: 'arms', equipment: 'Bodyweight', isCustom: false },
  
  // Legs
  { id: 'squat', name: 'Squat', muscleGroup: 'legs', equipment: 'Barbell', isCustom: false },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'legs', equipment: 'Machine', isCustom: false },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'legs', equipment: 'Dumbbells', isCustom: false },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'legs', equipment: 'Machine', isCustom: false },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'legs', equipment: 'Machine', isCustom: false },
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'legs', equipment: 'Machine', isCustom: false },
  
  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'core', equipment: 'Bodyweight', isCustom: false },
  { id: 'crunches', name: 'Crunches', muscleGroup: 'core', equipment: 'Bodyweight', isCustom: false },
  { id: 'leg-raise', name: 'Leg Raise', muscleGroup: 'core', equipment: 'Bodyweight', isCustom: false },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroup: 'core', equipment: 'Bodyweight', isCustom: false },
  
  // Cardio
  { id: 'running', name: 'Running', muscleGroup: 'cardio', isCustom: false },
  { id: 'cycling', name: 'Cycling', muscleGroup: 'cardio', isCustom: false },
  { id: 'rowing', name: 'Rowing', muscleGroup: 'cardio', equipment: 'Machine', isCustom: false },
  { id: 'jump-rope', name: 'Jump Rope', muscleGroup: 'cardio', isCustom: false },
  { id: 'stair-climber', name: 'Stair Climber', muscleGroup: 'cardio', equipment: 'Machine', isCustom: false },
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    type: 'strength',
    exercises: [
      { exerciseId: 'bench-press', targetSets: 4, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'overhead-press', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'incline-press', targetSets: 3, targetReps: '10-12', restSeconds: 60 },
      { exerciseId: 'lateral-raise', targetSets: 3, targetReps: '12-15', restSeconds: 45 },
      { exerciseId: 'tricep-pushdown', targetSets: 3, targetReps: '12-15', restSeconds: 45 },
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    type: 'strength',
    exercises: [
      { exerciseId: 'deadlift', targetSets: 4, targetReps: '5-6', restSeconds: 120 },
      { exerciseId: 'pull-ups', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'barbell-row', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'face-pull', targetSets: 3, targetReps: '15-20', restSeconds: 45 },
      { exerciseId: 'bicep-curl', targetSets: 3, targetReps: '10-12', restSeconds: 45 },
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    type: 'strength',
    exercises: [
      { exerciseId: 'squat', targetSets: 4, targetReps: '6-8', restSeconds: 120 },
      { exerciseId: 'leg-press', targetSets: 3, targetReps: '10-12', restSeconds: 90 },
      { exerciseId: 'lunges', targetSets: 3, targetReps: '10 each', restSeconds: 60 },
      { exerciseId: 'leg-curl', targetSets: 3, targetReps: '12-15', restSeconds: 45 },
      { exerciseId: 'calf-raise', targetSets: 4, targetReps: '15-20', restSeconds: 45 },
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
  },
  {
    id: 'full-body',
    name: 'Full Body',
    type: 'strength',
    exercises: [
      { exerciseId: 'squat', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'bench-press', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'barbell-row', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'overhead-press', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'plank', targetSets: 3, targetReps: '60s', restSeconds: 45 },
    ],
    estimatedDuration: 45,
    difficulty: 'beginner',
  },
];

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => {
    if (set.weight && set.reps && !set.isWarmup) {
      return total + (set.weight * set.reps);
    }
    return total;
  }, 0);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
