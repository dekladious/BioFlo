/**
 * Ultrahuman Connection Status
 * 
 * GET /api/integrations/ultrahuman/status
 * 
 * Get current connection status for Ultrahuman
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryOne, query } from "@/lib/db/client";
import { getConnectionStatus } from "@/lib/integrations/ultrahuman/client";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user ID
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [clerkUserId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get connection status
    const status = await getConnectionStatus(user.id);

    // Get recent data stats if connected
    let recentData = null;
    if (status.connected) {
      const stats = await queryOne<{
        days_with_data: number;
        latest_date: string;
        avg_sleep_hours: number;
        avg_hrv: number;
      }>(
        `SELECT 
          COUNT(DISTINCT date) as days_with_data,
          MAX(date)::text as latest_date,
          ROUND(AVG(sleep_total_minutes)::numeric / 60, 1) as avg_sleep_hours,
          ROUND(AVG(hrv_baseline)::numeric, 0) as avg_hrv
         FROM wearable_features_daily
         WHERE user_id = $1 
           AND 'ultrahuman' = ANY(source_flags)
           AND date >= CURRENT_DATE - INTERVAL '30 days'`,
        [user.id]
      );

      recentData = stats;
    }

    return NextResponse.json({
      connected: status.connected,
      lastSync: status.lastSync?.toISOString(),
      expiresAt: status.expiresAt?.toISOString(),
      recentData,
    });

  } catch (error) {
    console.error("Error getting Ultrahuman status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

