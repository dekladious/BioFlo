/**
 * Supplements API
 * CRUD operations for supplement tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";

// GET - Fetch supplements and their log status
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

    // Fetch supplements with today's log status and streak
    const supplements = await query<{
      id: string;
      name: string;
      brand: string;
      dosage: string;
      timing: string;
      frequency: string;
      purpose: string;
      notes: string;
      is_active: boolean;
      created_at: string;
      taken_today: boolean;
      streak: number;
    }>(
      `SELECT 
        s.*,
        EXISTS(
          SELECT 1 FROM supplement_logs sl 
          WHERE sl.supplement_id = s.id AND sl.taken_at::DATE = CURRENT_DATE
        ) as taken_today,
        (
          SELECT COUNT(DISTINCT taken_at::DATE)::INTEGER
          FROM supplement_logs sl
          WHERE sl.supplement_id = s.id
          AND sl.taken_at >= CURRENT_DATE - INTERVAL '30 days'
        ) as streak
       FROM user_supplements s
       WHERE s.user_id = $1 AND s.is_active = TRUE
       ORDER BY 
         CASE s.timing 
           WHEN 'morning' THEN 1 
           WHEN 'with_meals' THEN 2 
           WHEN 'afternoon' THEN 3 
           WHEN 'evening' THEN 4 
           WHEN 'before_bed' THEN 5 
           ELSE 6 
         END`,
      [user.id]
    );

    // Format and group
    const formatted = supplements.map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      dosage: s.dosage,
      timing: s.timing,
      frequency: s.frequency,
      purpose: s.purpose,
      notes: s.notes,
      isActive: s.is_active,
      takenToday: s.taken_today,
      streak: s.streak,
    }));

    // Group by timing
    const byTiming = formatted.reduce((acc, supp) => {
      const key = supp.timing || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(supp);
      return acc;
    }, {} as Record<string, typeof formatted>);

    // Stats
    const takenCount = supplements.filter((s) => s.taken_today).length;
    const totalActive = supplements.length;

    return NextResponse.json({
      supplements: formatted,
      byTiming,
      stats: {
        takenToday: takenCount,
        totalActive,
        adherenceRate: totalActive > 0 ? Math.round((takenCount / totalActive) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch supplements:", error);
    return NextResponse.json({ error: "Failed to fetch supplements" }, { status: 500 });
  }
}

// POST - Add a supplement
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
    const { name, brand, dosage, timing = "morning", frequency = "daily", purpose, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Supplement name is required" }, { status: 400 });
    }

    const supplement = await queryOne<{ id: string }>(
      `INSERT INTO user_supplements (user_id, name, brand, dosage, timing, frequency, purpose, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.id, name, brand, dosage, timing, frequency, purpose, notes]
    );

    return NextResponse.json({
      success: true,
      supplementId: supplement?.id,
    });
  } catch (error) {
    console.error("Failed to add supplement:", error);
    return NextResponse.json({ error: "Failed to add supplement" }, { status: 500 });
  }
}

// PATCH - Update supplement or log intake
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
    const { supplementId, action, data } = body;

    if (!supplementId) {
      return NextResponse.json({ error: "Supplement ID is required" }, { status: 400 });
    }

    // Verify ownership
    const supplement = await queryOne<{ id: string }>(
      `SELECT id FROM user_supplements WHERE id = $1 AND user_id = $2`,
      [supplementId, user.id]
    );

    if (!supplement) {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }

    switch (action) {
      case "toggle":
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM supplement_logs WHERE supplement_id = $1 AND taken_at::DATE = CURRENT_DATE`,
          [supplementId]
        );

        if (existing) {
          await query(`DELETE FROM supplement_logs WHERE id = $1`, [existing.id]);
          return NextResponse.json({ success: true, taken: false });
        } else {
          await query(
            `INSERT INTO supplement_logs (supplement_id, notes) VALUES ($1, $2)`,
            [supplementId, data?.notes]
          );
          return NextResponse.json({ success: true, taken: true });
        }

      case "log":
        await query(
          `INSERT INTO supplement_logs (supplement_id, notes) VALUES ($1, $2)`,
          [supplementId, data?.notes]
        );
        return NextResponse.json({ success: true });

      case "update":
        if (data) {
          const updates: string[] = [];
          const values: unknown[] = [];
          let idx = 1;

          if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
          if (data.brand !== undefined) { updates.push(`brand = $${idx++}`); values.push(data.brand); }
          if (data.dosage !== undefined) { updates.push(`dosage = $${idx++}`); values.push(data.dosage); }
          if (data.timing !== undefined) { updates.push(`timing = $${idx++}`); values.push(data.timing); }
          if (data.frequency !== undefined) { updates.push(`frequency = $${idx++}`); values.push(data.frequency); }
          if (data.purpose !== undefined) { updates.push(`purpose = $${idx++}`); values.push(data.purpose); }

          if (updates.length > 0) {
            values.push(supplementId);
            await query(`UPDATE user_supplements SET ${updates.join(", ")} WHERE id = $${idx}`, values);
          }
        }
        break;

      case "archive":
        await query(`UPDATE user_supplements SET is_active = FALSE WHERE id = $1`, [supplementId]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update supplement:", error);
    return NextResponse.json({ error: "Failed to update supplement" }, { status: 500 });
  }
}

// DELETE - Delete a supplement
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
    const supplementId = searchParams.get("id");

    if (!supplementId) {
      return NextResponse.json({ error: "Supplement ID is required" }, { status: 400 });
    }

    await query(`DELETE FROM user_supplements WHERE id = $1 AND user_id = $2`, [supplementId, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete supplement:", error);
    return NextResponse.json({ error: "Failed to delete supplement" }, { status: 500 });
  }
}
