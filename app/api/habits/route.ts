/**
 * Habits API
 * CRUD operations for habit tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

// GET - Fetch habits and their completion status
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

    // Fetch habits with today's completion status and streak
    const habits = await query<{
      id: string;
      name: string;
      description: string;
      category: string;
      frequency: string;
      target_count: number;
      icon: string;
      color: string;
      is_active: boolean;
      created_at: string;
      completed_today: boolean;
      streak: number;
    }>(
      `SELECT 
        h.*,
        EXISTS(
          SELECT 1 FROM habit_completions hc 
          WHERE hc.habit_id = h.id AND hc.completed_at::DATE = CURRENT_DATE
        ) as completed_today,
        (
          WITH consecutive_days AS (
            SELECT DISTINCT completed_at::DATE as day
            FROM habit_completions hc
            WHERE hc.habit_id = h.id
            ORDER BY day DESC
          ),
          numbered AS (
            SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) as rn
            FROM consecutive_days
          ),
          streaks AS (
            SELECT day, day + (rn || ' days')::INTERVAL as grp
            FROM numbered
          )
          SELECT COUNT(*)::INTEGER
          FROM streaks
          WHERE grp = (SELECT grp FROM streaks WHERE day = CURRENT_DATE - INTERVAL '1 day' OR day = CURRENT_DATE LIMIT 1)
        ) as streak
       FROM habits h
       WHERE h.user_id = $1 AND h.is_active = TRUE
       ORDER BY h.created_at ASC`,
      [user.id]
    );

    // Get week progress for each habit
    const habitsWithProgress = await Promise.all(
      habits.map(async (habit) => {
        const weekProgress = await query<{ day: string; completed: boolean }>(
          `SELECT 
            d::DATE as day,
            EXISTS(
              SELECT 1 FROM habit_completions hc 
              WHERE hc.habit_id = $1 AND hc.completed_at::DATE = d::DATE
            ) as completed
          FROM generate_series(
            CURRENT_DATE - INTERVAL '6 days', 
            CURRENT_DATE, 
            '1 day'
          ) as d
          ORDER BY d ASC`,
          [habit.id]
        );

        return {
          id: habit.id,
          name: habit.name,
          description: habit.description,
          category: habit.category,
          frequency: habit.frequency,
          targetCount: habit.target_count,
          icon: habit.icon,
          color: habit.color,
          isActive: habit.is_active,
          completedToday: habit.completed_today,
          streak: habit.streak || 0,
          weekProgress: weekProgress.map((p) => p.completed),
          createdAt: habit.created_at,
        };
      })
    );

    // Calculate stats
    const completedToday = habits.filter((h) => h.completed_today).length;
    const totalActive = habits.length;

    return NextResponse.json({
      habits: habitsWithProgress,
      stats: {
        completedToday,
        totalActive,
        completionRate: totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch habits:", error);
    return NextResponse.json({ error: "Failed to fetch habits" }, { status: 500 });
  }
}

// POST - Create a new habit
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
      description,
      category = "health",
      frequency = "daily",
      targetCount = 1,
      icon,
      color,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Habit name is required" }, { status: 400 });
    }

    const habit = await queryOne<{ id: string }>(
      `INSERT INTO habits (user_id, name, description, category, frequency, target_count, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.id, name, description, category, frequency, targetCount, icon, color]
    );

    return NextResponse.json({
      success: true,
      habitId: habit?.id,
      message: "Habit created successfully",
    });
  } catch (error) {
    console.error("Failed to create habit:", error);
    return NextResponse.json({ error: "Failed to create habit" }, { status: 500 });
  }
}

// PATCH - Update habit or toggle completion
export async function PATCH(req: NextRequest) {
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
    const { habitId, action, data } = body;

    if (!habitId) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    // Verify ownership
    const habit = await queryOne<{ id: string }>(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habitId, user.id]
    );

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    switch (action) {
      case "toggle":
      case "complete":
        // Toggle completion for today
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM habit_completions WHERE habit_id = $1 AND completed_at::DATE = CURRENT_DATE`,
          [habitId]
        );

        if (existing) {
          await query(`DELETE FROM habit_completions WHERE id = $1`, [existing.id]);
          return NextResponse.json({ success: true, completed: false });
        } else {
          await query(
            `INSERT INTO habit_completions (habit_id, notes) VALUES ($1, $2)`,
            [habitId, data?.notes]
          );
          return NextResponse.json({ success: true, completed: true });
        }

      case "update":
        if (data) {
          const updates: string[] = [];
          const values: unknown[] = [];
          let idx = 1;

          if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
          if (data.description !== undefined) { updates.push(`description = $${idx++}`); values.push(data.description); }
          if (data.category !== undefined) { updates.push(`category = $${idx++}`); values.push(data.category); }
          if (data.frequency !== undefined) { updates.push(`frequency = $${idx++}`); values.push(data.frequency); }
          if (data.icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(data.icon); }
          if (data.color !== undefined) { updates.push(`color = $${idx++}`); values.push(data.color); }

          if (updates.length > 0) {
            values.push(habitId);
            await query(`UPDATE habits SET ${updates.join(", ")} WHERE id = $${idx}`, values);
          }
        }
        break;

      case "archive":
        await query(`UPDATE habits SET is_active = FALSE WHERE id = $1`, [habitId]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update habit:", error);
    return NextResponse.json({ error: "Failed to update habit" }, { status: 500 });
  }
}

// DELETE - Delete a habit
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
    const habitId = searchParams.get("id");

    if (!habitId) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    await query(`DELETE FROM habits WHERE id = $1 AND user_id = $2`, [habitId, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete habit:", error);
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
