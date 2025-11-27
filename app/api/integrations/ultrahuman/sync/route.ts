/**
 * Ultrahuman Data Sync
 * 
 * POST /api/integrations/ultrahuman/sync
 * 
 * Manually trigger a data sync from Ultrahuman
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { syncUserData, isConnected } from "@/lib/integrations/ultrahuman/client";

export async function POST(request: NextRequest) {
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

    // Check if connected
    const connected = await isConnected(user.id);
    if (!connected) {
      return NextResponse.json({ error: "Ultrahuman not connected" }, { status: 400 });
    }

    // Get date range from request body
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7; // Default to 7 days
    
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Perform sync
    const result = await syncUserData(user.id, startDate, endDate);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Sync failed", daysProcessed: result.daysProcessed },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.daysProcessed} days of data`,
      daysProcessed: result.daysProcessed,
      dateRange: { startDate, endDate },
    });

  } catch (error) {
    console.error("Error syncing Ultrahuman data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

