/**
 * Nutrition/Meals API
 * CRUD operations for meal and hydration tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

// GET - Fetch today's meals and hydration
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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Fetch meals for the date
    const meals = await query<{
      id: string;
      meal_type: string;
      name: string;
      description: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      logged_at: string;
    }>(
      `SELECT * FROM meals 
       WHERE user_id = $1 AND logged_at::DATE = $2::DATE
       ORDER BY logged_at ASC`,
      [user.id, date]
    );

    // Fetch hydration logs for the date
    const hydration = await query<{
      id: string;
      amount_ml: number;
      beverage_type: string;
      logged_at: string;
    }>(
      `SELECT * FROM hydration_logs 
       WHERE user_id = $1 AND logged_at::DATE = $2::DATE
       ORDER BY logged_at ASC`,
      [user.id, date]
    );

    // Calculate totals
    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein_g || 0),
        carbs: acc.carbs + (meal.carbs_g || 0),
        fat: acc.fat + (meal.fat_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const waterTotal = hydration
      .filter((h) => h.beverage_type === "water")
      .reduce((acc, h) => acc + h.amount_ml, 0);

    // Format meals
    const formattedMeals = meals.map((m) => ({
      id: m.id,
      type: m.meal_type,
      name: m.name,
      description: m.description,
      calories: m.calories,
      protein: m.protein_g,
      carbs: m.carbs_g,
      fat: m.fat_g,
      time: new Date(m.logged_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }));

    // Get user's targets (could be from preferences)
    const targets = {
      calories: 2200,
      protein: 150,
      carbs: 250,
      fat: 70,
      waterMl: 2000,
    };

    return NextResponse.json({
      meals: formattedMeals,
      totals,
      targets,
      water: {
        totalMl: waterTotal,
        glasses: Math.floor(waterTotal / 250),
        targetMl: targets.waterMl,
      },
      date,
    });
  } catch (error) {
    console.error("Failed to fetch nutrition data:", error);
    return NextResponse.json({ error: "Failed to fetch nutrition data" }, { status: 500 });
  }
}

// POST - Log a meal or hydration
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
    const { type } = body; // 'meal' or 'water'

    if (type === "water") {
      const { amountMl = 250, beverageType = "water" } = body;
      
      const log = await queryOne<{ id: string }>(
        `INSERT INTO hydration_logs (user_id, amount_ml, beverage_type)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, amountMl, beverageType]
      );

      return NextResponse.json({ success: true, logId: log?.id });
    }

    // Meal logging
    const { mealType, name, description, calories, protein, carbs, fat } = body;

    if (!mealType || !name) {
      return NextResponse.json({ error: "Meal type and name are required" }, { status: 400 });
    }

    const meal = await queryOne<{ id: string }>(
      `INSERT INTO meals (user_id, meal_type, name, description, calories, protein_g, carbs_g, fat_g)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.id, mealType, name, description, calories, protein, carbs, fat]
    );

    return NextResponse.json({ success: true, mealId: meal?.id });
  } catch (error) {
    console.error("Failed to log nutrition:", error);
    return NextResponse.json({ error: "Failed to log nutrition" }, { status: 500 });
  }
}

// PATCH - Update water count (quick glass add/remove)
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
    const { action, glasses } = body;

    if (action === "set_water" && typeof glasses === "number") {
      // Remove today's water logs and add new ones
      await query(
        `DELETE FROM hydration_logs 
         WHERE user_id = $1 AND logged_at::DATE = CURRENT_DATE AND beverage_type = 'water'`,
        [user.id]
      );

      // Add new logs (one per glass for better tracking)
      for (let i = 0; i < glasses; i++) {
        await query(
          `INSERT INTO hydration_logs (user_id, amount_ml, beverage_type) VALUES ($1, 250, 'water')`,
          [user.id]
        );
      }

      return NextResponse.json({ success: true, glasses });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update water:", error);
    return NextResponse.json({ error: "Failed to update water" }, { status: 500 });
  }
}

// DELETE - Delete a meal
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
    const mealId = searchParams.get("id");

    if (!mealId) {
      return NextResponse.json({ error: "Meal ID is required" }, { status: 400 });
    }

    await query(`DELETE FROM meals WHERE id = $1 AND user_id = $2`, [mealId, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete meal:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
