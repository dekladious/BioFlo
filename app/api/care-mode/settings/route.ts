import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { CareModeContact } from "@/lib/utils/care-mode";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET: Fetch care mode settings
export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get or create user ID in database
    let user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      // Create user if they don't exist
      try {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        user = result[0];
        logger.info("Created user record for care mode settings", { userId, userDbId: user.id });
      } catch (createError) {
        logger.error("Failed to create user record for care mode", { error: createError, userId, requestId });
        return createErrorResponse("Failed to initialize user account", requestId, 500);
      }
    }

    // Get care mode settings (handle case where table might not exist)
    let settings: { enabled: boolean; contacts: unknown; check_in_timeout_hours: number } | null = null;
    try {
      settings = await queryOne<{
        enabled: boolean;
        contacts: unknown;
        check_in_timeout_hours: number;
      }>(
        "SELECT enabled, contacts, check_in_timeout_hours FROM care_mode_settings WHERE user_id = $1",
        [user.id]
      );
    } catch (dbError: unknown) {
      // If table doesn't exist or query fails, return defaults
      logger.warn("Care mode settings table query failed, returning defaults", {
        error: dbError,
        userId,
        requestId,
      });
      return Response.json({
        success: true,
        data: {
          enabled: false,
          contacts: [],
          checkInTimeoutHours: 2,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!settings) {
      // Return defaults if no settings exist
      return Response.json({
        success: true,
        data: {
          enabled: false,
          contacts: [],
          checkInTimeoutHours: 2,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      data: {
        enabled: settings.enabled,
        contacts: (settings.contacts as CareModeContact[]) || [],
        checkInTimeoutHours: settings.check_in_timeout_hours || 2,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Care mode settings API error", error);
    return createErrorResponse("Failed to fetch care mode settings", requestId, 500);
  }
}

// POST: Update care mode settings
export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { enabled, contacts, checkInTimeoutHours } = body;

    // Get or create user ID in database
    let user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      // Create user if they don't exist
      try {
        const result = await query<{ id: string }>(
          "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        user = result[0];
        logger.info("Created user record for care mode settings", { userId, userDbId: user.id });
      } catch (createError) {
        logger.error("Failed to create user record for care mode", { error: createError, userId, requestId });
        return createErrorResponse("Failed to initialize user account", requestId, 500);
      }
    }

    // Validate contacts (max 2)
    const contactsArray = (contacts as CareModeContact[]) || [];
    if (contactsArray.length > 2) {
      return createErrorResponse("Maximum 2 contacts allowed", requestId, 400);
    }

    // Validate contact format
    for (const contact of contactsArray) {
      if (!contact.name || (!contact.email && !contact.phone)) {
        return createErrorResponse("Each contact must have a name and at least email or phone", requestId, 400);
      }
    }

    // Upsert settings (handle case where table might not exist)
    try {
      await query(
        `INSERT INTO care_mode_settings (user_id, enabled, contacts, check_in_timeout_hours)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           enabled = EXCLUDED.enabled,
           contacts = EXCLUDED.contacts,
           check_in_timeout_hours = EXCLUDED.check_in_timeout_hours,
           updated_at = NOW()`,
        [
          user.id,
          enabled === true,
          JSON.stringify(contactsArray),
          checkInTimeoutHours || 2,
        ]
      );
    } catch (dbError: unknown) {
      // If table doesn't exist, log error and return helpful message
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        logger.error("Care mode settings table does not exist. Please run database migrations.", {
          error: dbError,
          userId,
          requestId,
        });
        return createErrorResponse(
          "Care mode feature requires database setup. Please contact support or run database migrations.",
          requestId,
          503
        );
      }
      throw dbError; // Re-throw other errors
    }

    logger.info("Care mode settings updated", {
      userId,
      enabled,
      contactsCount: contactsArray.length,
      requestId,
    });

    return Response.json({
      success: true,
      data: {
        message: "Care mode settings updated successfully",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Care mode settings update error", error);
    return createErrorResponse("Failed to update care mode settings", requestId, 500);
  }
}

