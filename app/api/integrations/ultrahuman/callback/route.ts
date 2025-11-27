/**
 * Ultrahuman OAuth - Callback Handler
 * 
 * GET /api/integrations/ultrahuman/callback
 * 
 * Handles the OAuth callback from Ultrahuman after user authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import {
  exchangeCodeForTokens,
  saveTokens,
  getProfile,
  syncUserData,
} from "@/lib/integrations/ultrahuman/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = new URL("/settings/integrations", baseUrl);

  // Handle OAuth errors
  if (error) {
    console.error("Ultrahuman OAuth error:", error, errorDescription);
    redirectUrl.searchParams.set("error", error);
    redirectUrl.searchParams.set("provider", "ultrahuman");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    redirectUrl.searchParams.set("error", "missing_params");
    redirectUrl.searchParams.set("provider", "ultrahuman");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Decode and validate state
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const { userId: clerkUserId, timestamp } = stateData;

    // Check state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      redirectUrl.searchParams.set("error", "state_expired");
      redirectUrl.searchParams.set("provider", "ultrahuman");
      return NextResponse.redirect(redirectUrl);
    }

    // Look up internal user ID
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [clerkUserId]
    );

    if (!user) {
      redirectUrl.searchParams.set("error", "user_not_found");
      redirectUrl.searchParams.set("provider", "ultrahuman");
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile from Ultrahuman
    const profile = await getProfile(tokens.access_token);
    const ultrahumanUserId = profile?.id;

    // Save tokens to database
    await saveTokens(user.id, tokens, ultrahumanUserId);

    // Trigger initial data sync (last 7 days)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Start sync in background (don't await)
    syncUserData(user.id, startDate, endDate).then((result) => {
      console.log(`Ultrahuman initial sync for user ${user.id}:`, result);
    }).catch((err) => {
      console.error(`Ultrahuman initial sync failed for user ${user.id}:`, err);
    });

    // Success - redirect to integrations page
    redirectUrl.searchParams.set("success", "connected");
    redirectUrl.searchParams.set("provider", "ultrahuman");
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Error processing Ultrahuman callback:", error);
    redirectUrl.searchParams.set("error", "callback_failed");
    redirectUrl.searchParams.set("provider", "ultrahuman");
    return NextResponse.redirect(redirectUrl);
  }
}

