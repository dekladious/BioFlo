/**
 * Training API Route
 * 
 * GET /api/training - Get workouts
 * POST /api/training - Create new workout
 * PATCH /api/training - Update workout
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";
import type { Workout, WorkoutExercise, ExerciseSet, Exercise } from "@/lib/types/training";
import { COMMON_EXERCISES } from "@/lib/types/training";

export const runtime = "nodejs";

// In-memory storage (would be database in production)
const workoutStore = new Map<string, Workout[]>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getExerciseFromId(exerciseId: string): Exercise {
  const exercise = COMMON_EXERCISES.find(e => e.id === exerciseId);
  if (exercise) return exercise;
  
  return {
    id: exerciseId,
    name: exerciseId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    category: 'strength',
    primaryMuscle: 'full_body',
    equipment: 'none',
    isCustom: true,
  };
}

// GET: Fetch workouts
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }
    
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    
    let workouts = workoutStore.get(userId) || [];
    
    if (date) {
      workouts = workouts.filter(w => w.date === date);
    }
    
    if (status) {
      workouts = workouts.filter(w => w.status === status);
    }
    
    workouts.sort((a, b) => b.date.localeCompare(a.date));
    workouts = workouts.slice(0, limit);
    
    // Calculate stats
    const allWorkouts = workoutStore.get(userId) || [];
    const completedWorkouts = allWorkouts.filter(w => w.status === 'completed');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekWorkouts = completedWorkouts.filter(w => new Date(w.date) >= weekAgo).length;
    
    logger.info("Training workouts fetched", { userId, count: workouts.length, requestId });
    
    return Response.json({
      success: true,
      data: {
        workouts,
        stats: {
          totalWorkouts: completedWorkouts.length,
          thisWeekWorkouts,
          streak: calculateStreak(allWorkouts),
        },
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error("Training GET error", error);
    return createErrorResponse("Failed to fetch workouts", requestId, 500);
  }
}

// POST: Create new workout
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }
    
    const body = await req.json();
    const { name, date, exercises = [] } = body;
    
    const workoutDate = date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    const workoutExercises: WorkoutExercise[] = exercises.map((ex: { exerciseId: string; targetSets?: number }, index: number) => {
      const exercise = getExerciseFromId(ex.exerciseId);
      const targetSets = ex.targetSets || 3;
      
      return {
        id: generateId("ex"),
        exerciseId: ex.exerciseId,
        exercise,
        sets: Array.from({ length: targetSets }, (_, i) => ({
          id: generateId("set"),
          setNumber: i + 1,
          setType: i === 0 ? 'warmup' : 'working',
          weightUnit: 'kg' as const,
          completed: false,
        })),
        restBetweenSets: 90,
        sortOrder: index,
      };
    });
    
    const workout: Workout = {
      id: generateId("workout"),
      userId,
      name: name || `Workout - ${new Date(workoutDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      date: workoutDate,
      startTime: new Date().toTimeString().slice(0, 5),
      status: 'in_progress',
      exercises: workoutExercises,
      createdAt: now,
      updatedAt: now,
    };
    
    const userWorkouts = workoutStore.get(userId) || [];
    userWorkouts.push(workout);
    workoutStore.set(userId, userWorkouts);
    
    logger.info("Workout created", { userId, workoutId: workout.id, requestId });
    
    return Response.json({
      success: true,
      data: { workout },
      requestId,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error("Training POST error", error);
    return createErrorResponse("Failed to create workout", requestId, 500);
  }
}

// PATCH: Update workout
export async function PATCH(req: Request) {
  const { requestId } = getRequestMetadata(req);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }
    
    const body = await req.json();
    const { workoutId, action, exerciseId, setId, updates, newExercise } = body;
    
    const userWorkouts = workoutStore.get(userId) || [];
    const workoutIndex = userWorkouts.findIndex(w => w.id === workoutId);
    
    if (workoutIndex === -1) {
      return createErrorResponse("Workout not found", requestId, 404);
    }
    
    const workout = { ...userWorkouts[workoutIndex] };
    const now = new Date().toISOString();
    
    switch (action) {
      case 'complete_set': {
        if (!exerciseId || !setId) {
          return createErrorResponse("Missing exerciseId or setId", requestId, 400);
        }
        
        workout.exercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.map(set => {
                if (set.id === setId) {
                  return {
                    ...set,
                    ...updates,
                    completed: true,
                    completedAt: now,
                  };
                }
                return set;
              }),
            };
          }
          return ex;
        });
        break;
      }
      
      case 'add_set': {
        if (!exerciseId) {
          return createErrorResponse("Missing exerciseId", requestId, 400);
        }
        
        workout.exercises = workout.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const lastSet = ex.sets[ex.sets.length - 1];
            return {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: generateId("set"),
                  setNumber: ex.sets.length + 1,
                  setType: 'working' as const,
                  weight: lastSet?.weight,
                  reps: lastSet?.reps,
                  weightUnit: lastSet?.weightUnit || 'kg',
                  completed: false,
                },
              ],
            };
          }
          return ex;
        });
        break;
      }
      
      case 'add_exercise': {
        if (!newExercise?.exerciseId) {
          return createErrorResponse("Missing newExercise", requestId, 400);
        }
        
        const exercise = getExerciseFromId(newExercise.exerciseId);
        const targetSets = newExercise.targetSets || 3;
        
        workout.exercises.push({
          id: generateId("ex"),
          exerciseId: newExercise.exerciseId,
          exercise,
          sets: Array.from({ length: targetSets }, (_, i) => ({
            id: generateId("set"),
            setNumber: i + 1,
            setType: i === 0 ? 'warmup' : 'working',
            weightUnit: 'kg' as const,
            completed: false,
          })),
          restBetweenSets: 90,
          sortOrder: workout.exercises.length,
        });
        break;
      }
      
      case 'remove_exercise': {
        if (!exerciseId) {
          return createErrorResponse("Missing exerciseId", requestId, 400);
        }
        workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
        break;
      }
      
      case 'complete_workout': {
        workout.status = 'completed';
        workout.endTime = new Date().toTimeString().slice(0, 5);
        
        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;
        
        workout.exercises.forEach(ex => {
          ex.sets.forEach(set => {
            if (set.completed) {
              totalSets++;
              if (set.reps) totalReps += set.reps;
              if (set.weight && set.reps) totalVolume += set.weight * set.reps;
            }
          });
        });
        
        workout.totalVolume = totalVolume;
        workout.totalSets = totalSets;
        workout.totalReps = totalReps;
        
        if (workout.startTime) {
          const [startH, startM] = workout.startTime.split(':').map(Number);
          const [endH, endM] = workout.endTime.split(':').map(Number);
          workout.duration = (endH * 60 + endM) - (startH * 60 + startM);
        }
        break;
      }
      
      default:
        return createErrorResponse("Invalid action", requestId, 400);
    }
    
    workout.updatedAt = now;
    userWorkouts[workoutIndex] = workout;
    workoutStore.set(userId, userWorkouts);
    
    logger.info("Workout updated", { userId, workoutId, action, requestId });
    
    return Response.json({
      success: true,
      data: { workout },
      requestId,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error("Training PATCH error", error);
    return createErrorResponse("Failed to update workout", requestId, 500);
  }
}

function calculateStreak(workouts: Workout[]): number {
  if (!workouts.length) return 0;
  
  const completed = workouts
    .filter(w => w.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date));
  
  if (!completed.length) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (const workout of completed) {
    const workoutDate = new Date(workout.date);
    workoutDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }
  
  return streak;
}
