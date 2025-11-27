/**
 * Wearables API Route
 * 
 * GET /api/wearables - List connected devices
 * POST /api/wearables - Connect a new device
 * DELETE /api/wearables - Disconnect a device
 */

import { auth } from "@clerk/nextjs/server";
import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { getRequestMetadata, createErrorResponse } from "@/lib/api-utils";
import type { WearableDevice, WearableProvider, ConnectionStatus, DailyHealthSummary } from "@/lib/types/wearable";

export const runtime = "nodejs";

// ============================================================================
// GET: List connected wearables and their status
// ============================================================================

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    // Get user record
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return Response.json({
        success: true,
        data: {
          devices: [],
          hasAnyDevice: false,
          latestSync: null,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Get connected devices
    const devices = await query<{
      id: string;
      device_type: string;
      device_name: string | null;
      connected: boolean;
      last_sync_at: string | null;
      sync_frequency_minutes: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, device_type, device_name, connected, last_sync_at, sync_frequency_minutes, created_at, updated_at
       FROM wearable_devices
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    );

    const formattedDevices: Partial<WearableDevice>[] = devices.map(d => ({
      id: d.id,
      provider: d.device_type as WearableProvider,
      deviceName: d.device_name || undefined,
      status: d.connected ? 'connected' : 'disconnected' as ConnectionStatus,
      lastSyncAt: d.last_sync_at || undefined,
      syncFrequencyMinutes: d.sync_frequency_minutes || 60,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    // Get latest health summary
    const latestSummary = await queryOne<{
      date: string;
      readiness_score: number | null;
      sleep_score: number | null;
      hrv_avg: number | null;
      resting_hr: number | null;
      synced_at: string;
    }>(
      `SELECT date, readiness_score, sleep_score, hrv_avg, resting_hr, synced_at
       FROM wearable_features_daily
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 1`,
      [user.id]
    );

    logger.info("Wearables fetched", { userId, deviceCount: devices.length, requestId });

    return Response.json({
      success: true,
      data: {
        devices: formattedDevices,
        hasAnyDevice: devices.length > 0,
        hasConnectedDevice: devices.some(d => d.connected),
        latestSync: latestSummary ? {
          date: latestSummary.date,
          readinessScore: latestSummary.readiness_score,
          sleepScore: latestSummary.sleep_score,
          hrvAvg: latestSummary.hrv_avg,
          restingHr: latestSummary.resting_hr,
          syncedAt: latestSummary.synced_at,
        } : null,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Wearables GET error", error);
    return createErrorResponse("Failed to fetch wearables", requestId, 500);
  }
}

// ============================================================================
// POST: Connect a new wearable device
// ============================================================================

export async function POST(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const body = await req.json();
    const { provider, accessToken, refreshToken, deviceName } = body as {
      provider: WearableProvider;
      accessToken?: string;
      refreshToken?: string;
      deviceName?: string;
    };

    if (!provider) {
      return createErrorResponse("Provider is required", requestId, 400);
    }

    // Get or create user
    let user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      const result = await query<{ id: string }>(
        "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
        [userId]
      );
      user = result[0];
    }

    // Check if device already exists
    const existingDevice = await queryOne<{ id: string }>(
      "SELECT id FROM wearable_devices WHERE user_id = $1 AND device_type = $2",
      [user.id, provider]
    );

    if (existingDevice) {
      // Update existing device
      await query(
        `UPDATE wearable_devices 
         SET connected = true, 
             access_token = COALESCE($1, access_token),
             refresh_token = COALESCE($2, refresh_token),
             device_name = COALESCE($3, device_name),
             updated_at = NOW()
         WHERE id = $4`,
        [accessToken, refreshToken, deviceName, existingDevice.id]
      );

      logger.info("Wearable reconnected", { userId, provider, requestId });

      return Response.json({
        success: true,
        data: {
          message: `${provider} reconnected successfully`,
          deviceId: existingDevice.id,
          isReconnection: true,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    // Create new device connection
    const newDevice = await query<{ id: string }>(
      `INSERT INTO wearable_devices (user_id, device_type, device_name, connected, access_token, refresh_token, sync_frequency_minutes)
       VALUES ($1, $2, $3, true, $4, $5, 60)
       RETURNING id`,
      [user.id, provider, deviceName || null, accessToken || null, refreshToken || null]
    );

    logger.info("Wearable connected", { userId, provider, deviceId: newDevice[0]?.id, requestId });

    return Response.json({
      success: true,
      data: {
        message: `${provider} connected successfully`,
        deviceId: newDevice[0]?.id,
        isReconnection: false,
        nextSteps: [
          "Your device will start syncing automatically",
          "First sync may take a few minutes",
          "Check back on your dashboard for health insights",
        ],
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Wearables POST error", error);
    return createErrorResponse("Failed to connect wearable", requestId, 500);
  }
}

// ============================================================================
// DELETE: Disconnect a wearable device
// ============================================================================

export async function DELETE(req: Request) {
  const { requestId } = getRequestMetadata(req);

  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse("Unauthorized", requestId, 401);
    }

    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId");
    const provider = url.searchParams.get("provider");

    if (!deviceId && !provider) {
      return createErrorResponse("deviceId or provider is required", requestId, 400);
    }

    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (!user) {
      return createErrorResponse("User not found", requestId, 404);
    }

    // Disconnect device (soft delete - mark as disconnected)
    if (deviceId) {
      await query(
        `UPDATE wearable_devices 
         SET connected = false, access_token = NULL, refresh_token = NULL, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [deviceId, user.id]
      );
    } else if (provider) {
      await query(
        `UPDATE wearable_devices 
         SET connected = false, access_token = NULL, refresh_token = NULL, updated_at = NOW()
         WHERE device_type = $1 AND user_id = $2`,
        [provider, user.id]
      );
    }

    logger.info("Wearable disconnected", { userId, deviceId, provider, requestId });

    return Response.json({
      success: true,
      data: {
        message: "Device disconnected successfully",
      },
      requestId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Wearables DELETE error", error);
    return createErrorResponse("Failed to disconnect wearable", requestId, 500);
  }
}

