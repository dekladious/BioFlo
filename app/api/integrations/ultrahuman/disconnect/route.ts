/**
 * Ultrahuman Disconnect
 * 
 * POST /api/integrations/ultrahuman/disconnect
 * 
 * Disconnect Ultrahuman integration
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { deleteTokens } from "@/lib/integrations/ultrahuman/client";

export async function POST() {
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

    // Delete tokens and mark device as inactive
    await deleteTokens(user.id);

    return NextResponse.json({
      success: true,
      message: "Ultrahuman disconnected successfully",
    });

  } catch (error) {
    console.error("Error disconnecting Ultrahuman:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

