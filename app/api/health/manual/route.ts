/**
 * Manual Health Entry API
 * For users without wearables to log health metrics manually
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

// GET - Fetch recent manual entries
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
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 90);
    const date = searchParams.get("date"); // Optional: get specific date

    let queryStr = `
      SELECT 
        date,
        weight_kg,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        blood_glucose_mg_dl,
        blood_oxygen_percent,
        temperature_celsius,
        resting_heart_rate,
        energy_level,
        mood_score,
        sleep_duration_minutes,
        sleep_quality_score,
        steps,
        active_minutes,
        meditation_minutes,
        notes,
        source,
        created_at
      FROM health_metrics
      WHERE user_id = $1 AND source = 'manual'
    `;

    const params: unknown[] = [user.id];

    if (date) {
      queryStr += ` AND date = $2::DATE ORDER BY created_at DESC LIMIT 1`;
      params.push(date);
    } else {
      queryStr += ` AND date >= CURRENT_DATE - INTERVAL '${days} days' ORDER BY date DESC`;
    }

    const entries = await query<{
      date: string;
      weight_kg: number;
      blood_pressure_systolic: number;
      blood_pressure_diastolic: number;
      blood_glucose_mg_dl: number;
      blood_oxygen_percent: number;
      temperature_celsius: number;
      resting_heart_rate: number;
      energy_level: number;
      mood_score: number;
      sleep_duration_minutes: number;
      sleep_quality_score: number;
      steps: number;
      active_minutes: number;
      meditation_minutes: number;
      notes: string;
      source: string;
      created_at: string;
    }>(queryStr, params);

    // Format for frontend
    const formattedEntries = entries.map((e) => ({
      date: e.date,
      weight: e.weight_kg,
      bloodPressure: e.blood_pressure_systolic
        ? { systolic: e.blood_pressure_systolic, diastolic: e.blood_pressure_diastolic }
        : null,
      bloodGlucose: e.blood_glucose_mg_dl,
      bloodOxygen: e.blood_oxygen_percent,
      temperature: e.temperature_celsius,
      restingHeartRate: e.resting_heart_rate,
      energyLevel: e.energy_level,
      moodScore: e.mood_score,
      sleepMinutes: e.sleep_duration_minutes,
      sleepQuality: e.sleep_quality_score,
      steps: e.steps,
      activeMinutes: e.active_minutes,
      meditationMinutes: e.meditation_minutes,
      notes: e.notes,
    }));

    // Get today's entry specifically
    const today = await queryOne<{ id: string }>(
      `SELECT id FROM health_metrics WHERE user_id = $1 AND date = CURRENT_DATE AND source = 'manual'`,
      [user.id]
    );

    return NextResponse.json({
      entries: formattedEntries,
      hasTodayEntry: !!today,
    });
  } catch (error) {
    console.error("Failed to fetch manual entries:", error);
    return NextResponse.json({ error: "Failed to fetch manual entries" }, { status: 500 });
  }
}

// POST - Log manual health entry
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
      date = new Date().toISOString().split("T")[0],
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodGlucose,
      bloodOxygen,
      temperature,
      restingHeartRate,
      energyLevel,
      moodScore,
      sleepMinutes,
      sleepQuality,
      steps,
      activeMinutes,
      meditationMinutes,
      notes,
    } = body;

    // Upsert - update if exists, insert if not
    await query(
      `INSERT INTO health_metrics (
        user_id, date, source,
        weight_kg, blood_pressure_systolic, blood_pressure_diastolic,
        blood_glucose_mg_dl, blood_oxygen_percent, temperature_celsius,
        resting_heart_rate, energy_level, mood_score,
        sleep_duration_minutes, sleep_quality_score,
        steps, active_minutes, meditation_minutes, notes
      ) VALUES (
        $1, $2, 'manual',
        $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      ON CONFLICT (user_id, date, source) 
      DO UPDATE SET
        weight_kg = COALESCE(EXCLUDED.weight_kg, health_metrics.weight_kg),
        blood_pressure_systolic = COALESCE(EXCLUDED.blood_pressure_systolic, health_metrics.blood_pressure_systolic),
        blood_pressure_diastolic = COALESCE(EXCLUDED.blood_pressure_diastolic, health_metrics.blood_pressure_diastolic),
        blood_glucose_mg_dl = COALESCE(EXCLUDED.blood_glucose_mg_dl, health_metrics.blood_glucose_mg_dl),
        blood_oxygen_percent = COALESCE(EXCLUDED.blood_oxygen_percent, health_metrics.blood_oxygen_percent),
        temperature_celsius = COALESCE(EXCLUDED.temperature_celsius, health_metrics.temperature_celsius),
        resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, health_metrics.resting_heart_rate),
        energy_level = COALESCE(EXCLUDED.energy_level, health_metrics.energy_level),
        mood_score = COALESCE(EXCLUDED.mood_score, health_metrics.mood_score),
        sleep_duration_minutes = COALESCE(EXCLUDED.sleep_duration_minutes, health_metrics.sleep_duration_minutes),
        sleep_quality_score = COALESCE(EXCLUDED.sleep_quality_score, health_metrics.sleep_quality_score),
        steps = COALESCE(EXCLUDED.steps, health_metrics.steps),
        active_minutes = COALESCE(EXCLUDED.active_minutes, health_metrics.active_minutes),
        meditation_minutes = COALESCE(EXCLUDED.meditation_minutes, health_metrics.meditation_minutes),
        notes = COALESCE(EXCLUDED.notes, health_metrics.notes),
        updated_at = NOW()`,
      [
        user.id,
        date,
        weight || null,
        bloodPressureSystolic || null,
        bloodPressureDiastolic || null,
        bloodGlucose || null,
        bloodOxygen || null,
        temperature || null,
        restingHeartRate || null,
        energyLevel || null,
        moodScore || null,
        sleepMinutes || null,
        sleepQuality || null,
        steps || null,
        activeMinutes || null,
        meditationMinutes || null,
        notes || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Health data logged successfully",
    });
  } catch (error) {
    console.error("Failed to log manual entry:", error);
    return NextResponse.json({ error: "Failed to log manual entry" }, { status: 500 });
  }
}

// PATCH - Quick update specific field
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
    const { field, value, date = new Date().toISOString().split("T")[0] } = body;

    // Map of allowed fields
    const fieldMap: Record<string, string> = {
      weight: "weight_kg",
      bloodPressureSystolic: "blood_pressure_systolic",
      bloodPressureDiastolic: "blood_pressure_diastolic",
      bloodGlucose: "blood_glucose_mg_dl",
      bloodOxygen: "blood_oxygen_percent",
      temperature: "temperature_celsius",
      restingHeartRate: "resting_heart_rate",
      energyLevel: "energy_level",
      moodScore: "mood_score",
      sleepMinutes: "sleep_duration_minutes",
      sleepQuality: "sleep_quality_score",
      steps: "steps",
      activeMinutes: "active_minutes",
      meditationMinutes: "meditation_minutes",
      notes: "notes",
    };

    const dbField = fieldMap[field];
    if (!dbField) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    // Upsert the specific field
    await query(
      `INSERT INTO health_metrics (user_id, date, source, ${dbField})
       VALUES ($1, $2, 'manual', $3)
       ON CONFLICT (user_id, date, source) 
       DO UPDATE SET ${dbField} = $3, updated_at = NOW()`,
      [user.id, date, value]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}
