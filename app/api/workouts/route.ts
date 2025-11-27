/**
 * Workouts API
 * CRUD operations for workout tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

// GET - Fetch workouts
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE clerk_user_id = $1`,
      [clerkUserId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const days = parseInt(searchParams.get("days") || "30");

    const workouts = await query<{
      id: string;
      name: string;
      workout_type: string;
      duration_minutes: number;
      calories_burned: number;
      avg_heart_rate: number;
      max_heart_rate: number;
      notes: string;
      completed: boolean;
      started_at: string;
      completed_at: string;
    }>(
      `SELECT * FROM workouts 
       WHERE user_id = $1 
       AND started_at >= CURRENT_DATE - INTERVAL '${Math.min(days, 90)} days'
       ORDER BY started_at DESC
       LIMIT $2`,
      [user.id, limit]
    );

    // Fetch exercises for each workout
    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout) => {
        const exercises = await query<{
          id: string;
          exercise_name: string;
          muscle_group: string;
        }>(
          `SELECT id, exercise_name, muscle_group FROM workout_exercises 
           WHERE workout_id = $1 ORDER BY order_index`,
          [workout.id]
        );

        return {
          id: workout.id,
          name: workout.name,
          type: workout.workout_type,
          duration: workout.duration_minutes,
          calories: workout.calories_burned,
          heartRateAvg: workout.avg_heart_rate,
          heartRateMax: workout.max_heart_rate,
          notes: workout.notes,
          completed: workout.completed,
          date: workout.started_at,
          exercises: exercises.map((e) => ({
            id: e.id,
            name: e.exercise_name,
            muscleGroup: e.muscle_group,
          })),
        };
      })
    );

    // Calculate weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weeklyStats = await queryOne<{
      count: string;
      total_minutes: string;
      total_calories: string;
    }>(
      `SELECT 
        COUNT(*)::TEXT as count,
        COALESCE(SUM(duration_minutes), 0)::TEXT as total_minutes,
        COALESCE(SUM(calories_burned), 0)::TEXT as total_calories
       FROM workouts 
       WHERE user_id = $1 
       AND started_at >= $2
       AND completed = TRUE`,
      [user.id, weekStart.toISOString()]
    );

    return NextResponse.json({
      workouts: workoutsWithExercises,
      stats: {
        weeklyWorkouts: parseInt(weeklyStats?.count || "0"),
        weeklyMinutes: parseInt(weeklyStats?.total_minutes || "0"),
        weeklyCalories: parseInt(weeklyStats?.total_calories || "0"),
      },
    });
  } catch (error) {
    console.error("Failed to fetch workouts:", error);
    return NextResponse.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}

// POST - Log a workout
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE clerk_user_id = $1`,
      [clerkUserId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      type = "strength",
      duration,
      calories,
      heartRateAvg,
      heartRateMax,
      notes,
      exercises = [],
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Workout name is required" }, { status: 400 });
    }

    // Create workout
    const workout = await queryOne<{ id: string }>(
      `INSERT INTO workouts (
        user_id, name, workout_type, duration_minutes, calories_burned,
        avg_heart_rate, max_heart_rate, notes, completed, started_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
       RETURNING id`,
      [user.id, name, type, duration, calories, heartRateAvg, heartRateMax, notes]
    );

    if (!workout) {
      throw new Error("Failed to create workout");
    }

    // Add exercises if provided
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      await query(
        `INSERT INTO workout_exercises (workout_id, exercise_name, muscle_group, order_index)
         VALUES ($1, $2, $3, $4)`,
        [workout.id, exercise.name, exercise.muscleGroup || "", i]
      );
    }

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      message: "Workout logged successfully",
    });
  } catch (error) {
    console.error("Failed to log workout:", error);
    return NextResponse.json({ error: "Failed to log workout" }, { status: 500 });
  }
}

// DELETE - Delete a workout
export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE clerk_user_id = $1`,
      [clerkUserId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const workoutId = searchParams.get("id");

    if (!workoutId) {
      return NextResponse.json({ error: "Workout ID is required" }, { status: 400 });
    }

    await query(`DELETE FROM workouts WHERE id = $1 AND user_id = $2`, [workoutId, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workout:", error);
    return NextResponse.json({ error: "Failed to delete workout" }, { status: 500 });
  }
}
