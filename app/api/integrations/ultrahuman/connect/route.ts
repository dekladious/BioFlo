/**
 * Ultrahuman OAuth - Initiate Connection
 * 
 * GET /api/integrations/ultrahuman/connect
 * 
 * Redirects user to Ultrahuman's OAuth authorization page
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildAuthorizationUrl } from "@/lib/integrations/ultrahuman/config";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL));
    }
    
    // Generate state parameter (includes user ID for callback verification)
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2),
    })).toString("base64url");
    
    // Build authorization URL
    const authUrl = buildAuthorizationUrl(state);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Ultrahuman connection:", error);
    
    // Redirect back to integrations page with error
    const redirectUrl = new URL("/settings/integrations", process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set("error", "connection_failed");
    redirectUrl.searchParams.set("provider", "ultrahuman");
    
    return NextResponse.redirect(redirectUrl);
  }
}

