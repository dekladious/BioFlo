/**
 * Protocol Context Helper
 * 
 * Generates human-readable protocol status summaries for use in AI context
 */

import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export type ProtocolRunData = {
  id: number;
  protocol_id: number;
  status: string;
  started_at: Date;
  state: unknown;
  protocol_name: string;
  protocol_slug: string;
  protocol_config: unknown;
};

export type ProtocolLogData = {
  day_index: number;
  completed: boolean;
  notes: string | null;
};

/**
 * Get protocol status summary for a user
 * Returns a string suitable for inclusion in AI prompts
 */
export async function getProtocolStatusSummary(userDbId: string): Promise<string> {
  try {
    // Get active protocol run
    const protocolRun = await queryOne<ProtocolRunData>(
      `SELECT 
        pr.id,
        pr.protocol_id,
        pr.status,
        pr.started_at,
        pr.state,
        p.name as protocol_name,
        p.slug as protocol_slug,
        p.config as protocol_config
       FROM protocol_runs pr
       JOIN protocols p ON pr.protocol_id = p.id
       WHERE pr.user_id = $1 AND pr.status = 'active'
       ORDER BY pr.started_at DESC
       LIMIT 1`,
      [userDbId]
    );

    if (!protocolRun) {
      return "No active protocols";
    }

    // Get protocol config
    const config = protocolRun.protocol_config as {
      duration?: number;
      days?: Array<{
        day: number;
        title: string;
        summary?: string;
      }>;
    };

    // Get logs
    const logs = await query<ProtocolLogData>(
      `SELECT day_index, completed, notes
       FROM protocol_logs
       WHERE protocol_run_id = $1
       ORDER BY day_index ASC`,
      [protocolRun.id]
    );

    // Calculate current day
    const state = protocolRun.state as { current_day?: number; day?: number } | null;
    const currentDay = state?.current_day || state?.day || 1;
    const totalDays = config.duration || (config.days?.length || 0);

    // Get today's day data
    const todayDay = config.days?.find((d) => d.day === currentDay);
    const todayTitle = todayDay?.title || `Day ${currentDay}`;
    const todaySummary = todayDay?.summary || "";

    // Get yesterday's completion status
    const yesterdayLog = logs.find((log) => log.day_index === currentDay - 1);
    const yesterdayCompleted = yesterdayLog?.completed || false;
    const yesterdayNotes = yesterdayLog?.notes || null;

    // Build summary string
    let summary = `User is on the '${protocolRun.protocol_name}' protocol, active, Day ${currentDay} of ${totalDays}.\n`;
    summary += `Today's focus: '${todayTitle}'.`;
    if (todaySummary) {
      summary += ` ${todaySummary}`;
    }
    summary += `\nYesterday's completion: ${yesterdayCompleted ? "true" : "false"}.`;
    if (yesterdayNotes) {
      summary += ` User note: '${yesterdayNotes}'.`;
    }

    // Add completion stats
    const completedDays = logs.filter((log) => log.completed).length;
    if (completedDays > 0) {
      summary += `\nCompleted days: ${completedDays}/${totalDays}.`;
    }

    return summary;
  } catch (error) {
    logger.warn("Protocol status summary generation failed", { error, userDbId });
    return "No active protocols";
  }
}

