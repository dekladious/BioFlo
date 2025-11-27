import { query, queryOne } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export type ExperimentDigestItem = {
  name: string;
  status: string;
  start_date: string | null;
  ai_summary: string | null;
  system_label: string | null;
};

export type ExperimentDigest = {
  summary?: string;
  items: ExperimentDigestItem[];
  activeCount: number;
  needsReviewCount: number;
};

export async function getExperimentDigest(
  userId: string,
  limit = 3
): Promise<ExperimentDigest> {
  try {
    const rows = await query<ExperimentDigestItem>(
      `
      SELECT
        ue.name,
        ue.status,
        ue.start_date,
        uef.ai_summary,
        uef.system_label
      FROM user_experiments ue
      LEFT JOIN user_experiment_feedback uef ON ue.id = uef.experiment_id
      WHERE ue.user_id = $1
      ORDER BY ue.updated_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    if (!rows.length) {
      return {
        summary: undefined,
        items: [],
        activeCount: 0,
        needsReviewCount: 0,
      };
    }

    const summary = rows
      .map((exp) => {
        const status = exp.status.replace(/_/g, " ").toLowerCase();
        const verdict = exp.system_label
          ? ` verdict: ${exp.system_label}`
          : "";
        const narrative = exp.ai_summary ? ` – ${exp.ai_summary}` : verdict;
        const started = exp.start_date
          ? ` (since ${exp.start_date})`
          : "";
        return `${exp.name}${started} – ${status}${narrative ?? ""}`;
      })
      .join("\n");

    const activeCount = rows.filter(
      (exp) => exp.status === "active" || exp.status === "scheduled"
    ).length;
    const needsReviewCount = rows.filter(
      (exp) => exp.status === "completed" && !exp.system_label
    ).length;

    return {
      summary,
      items: rows,
      activeCount,
      needsReviewCount,
    };
  } catch (error) {
    logger.debug("Experiment digest fetch failed", { error, userId });
    return {
      summary: undefined,
      items: [],
      activeCount: 0,
      needsReviewCount: 0,
    };
  }
}

export type CareStatusDigest = {
  summary?: string;
  enabled: boolean;
  contactsCount: number;
  pendingPrompts: number;
};

export async function getCareStatusDigest(
  userId: string
): Promise<CareStatusDigest> {
  try {
    const settings = await queryOne<{
      enabled: boolean;
      contacts: unknown;
      check_in_timeout_hours: number;
    }>("SELECT enabled, contacts, check_in_timeout_hours FROM care_mode_settings WHERE user_id = $1", [
      userId,
    ]);

    const contactsArr = Array.isArray(settings?.contacts)
      ? (settings?.contacts as unknown[])
      : [];

    const pending = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM care_mode_check_ins
       WHERE user_id = $1 AND responded_at IS NULL`,
      [userId]
    );

    const pendingCount = pending ? Number(pending.count) : 0;

    const summaryParts: string[] = [];
    if (!settings || !settings.enabled) {
      summaryParts.push("Care Mode is currently disabled.");
    } else {
      summaryParts.push(
        `Care Mode enabled with ${contactsArr.length} contact${
          contactsArr.length === 1 ? "" : "s"
        }.`
      );
      summaryParts.push(
        pendingCount
          ? `${pendingCount} pending check-in${
              pendingCount === 1 ? "" : "s"
            }`
          : "All recent check-ins acknowledged"
      );
    }

    return {
      summary: summaryParts.join(" "),
      enabled: Boolean(settings?.enabled),
      contactsCount: contactsArr.length,
      pendingPrompts: pendingCount,
    };
  } catch (error) {
    logger.debug("Care status digest failed", { error, userId });
    return {
      summary: undefined,
      enabled: false,
      contactsCount: 0,
      pendingPrompts: 0,
    };
  }
}

export type WomensHealthDigest = {
  summary?: string;
  currentPhase?: string | null;
  dayOfCycle?: number | null;
  issues?: string[];
};

export async function getWomensHealthDigest(
  userId: string
): Promise<WomensHealthDigest> {
  try {
    const profile = await queryOne<{
      cycle_length: number | null;
      current_phase: string | null;
      day_of_cycle: number | null;
      issues: string[] | null;
      notes: string | null;
      updated_at: Date | null;
    }>(
      `SELECT cycle_length, current_phase, day_of_cycle, issues, notes, updated_at
       FROM womens_health_profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (!profile) {
      return { summary: undefined };
    }

    const summaryParts: string[] = [];
    if (profile.current_phase) {
      summaryParts.push(
        `Currently in ${profile.current_phase.replace(/_/g, " ")} phase`
      );
    }
    if (profile.day_of_cycle) {
      summaryParts.push(`Day ${profile.day_of_cycle} of cycle`);
    }
    if (profile.issues && profile.issues.length) {
      summaryParts.push(
        `Key symptoms: ${profile.issues.map((issue) => issue.replace(/_/g, " ")).join(", ")}`
      );
    }
    if (profile.notes) {
      summaryParts.push(profile.notes);
    }

    return {
      summary: summaryParts.join(". "),
      currentPhase: profile.current_phase,
      dayOfCycle: profile.day_of_cycle,
      issues: profile.issues || [],
    };
  } catch (error) {
    // Table may not exist for MVP - silently return empty
    // logger.debug("Womens health digest failed", { error, userId });
    return { summary: undefined };
  }
}

// ============ HABIT TRACKING CONTEXT ============

export type HabitDigest = {
  summary?: string;
  totalHabits: number;
  completedToday: number;
  streaks: { name: string; streak: number }[];
};

export async function getHabitDigest(userId: string): Promise<HabitDigest> {
  try {
    const habits = await query<{
      name: string;
      streak: number;
      completed_today: boolean;
    }>(
      `SELECT 
        uh.name,
        COALESCE(uh.current_streak, 0) as streak,
        EXISTS(
          SELECT 1 FROM habit_logs hl 
          WHERE hl.habit_id = uh.id 
          AND hl.logged_at::date = CURRENT_DATE
        ) as completed_today
       FROM user_habits uh
       WHERE uh.user_id = $1 AND uh.is_active = true
       ORDER BY uh.current_streak DESC
       LIMIT 10`,
      [userId]
    );

    if (!habits.length) {
      return { summary: undefined, totalHabits: 0, completedToday: 0, streaks: [] };
    }

    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.completed_today).length;
    const topStreaks = habits
      .filter(h => h.streak > 0)
      .slice(0, 3)
      .map(h => ({ name: h.name, streak: h.streak }));

    const summaryParts: string[] = [];
    summaryParts.push(`${completedToday}/${totalHabits} habits completed today`);
    if (topStreaks.length > 0) {
      const streakText = topStreaks.map(s => `${s.name} (${s.streak} days)`).join(", ");
      summaryParts.push(`Top streaks: ${streakText}`);
    }

    return {
      summary: summaryParts.join(". "),
      totalHabits,
      completedToday,
      streaks: topStreaks,
    };
  } catch (error) {
    logger.debug("Habit digest fetch failed", { error, userId });
    return { summary: undefined, totalHabits: 0, completedToday: 0, streaks: [] };
  }
}

// ============ SUPPLEMENT TRACKING CONTEXT ============

export type SupplementDigest = {
  summary?: string;
  supplements: { name: string; timing: string; takenToday: boolean }[];
  totalSupplements: number;
  takenToday: number;
};

export async function getSupplementDigest(userId: string): Promise<SupplementDigest> {
  try {
    const supplements = await query<{
      name: string;
      dosage: string;
      timing: string;
      taken_today: boolean;
    }>(
      `SELECT 
        us.name,
        us.dosage,
        us.timing,
        EXISTS(
          SELECT 1 FROM supplement_logs sl 
          WHERE sl.supplement_id = us.id 
          AND sl.logged_at::date = CURRENT_DATE
        ) as taken_today
       FROM user_supplements us
       WHERE us.user_id = $1 AND us.is_active = true
       ORDER BY us.timing ASC`,
      [userId]
    );

    if (!supplements.length) {
      return { summary: undefined, supplements: [], totalSupplements: 0, takenToday: 0 };
    }

    const totalSupplements = supplements.length;
    const takenToday = supplements.filter(s => s.taken_today).length;

    const summaryParts: string[] = [];
    summaryParts.push(`${takenToday}/${totalSupplements} supplements taken today`);
    
    const supplementList = supplements.map(s => `${s.name} (${s.dosage})`).join(", ");
    summaryParts.push(`Current stack: ${supplementList}`);

    return {
      summary: summaryParts.join(". "),
      supplements: supplements.map(s => ({ name: s.name, timing: s.timing, takenToday: s.taken_today })),
      totalSupplements,
      takenToday,
    };
  } catch (error) {
    logger.debug("Supplement digest fetch failed", { error, userId });
    return { summary: undefined, supplements: [], totalSupplements: 0, takenToday: 0 };
  }
}

// ============ RECENT CHECK-INS CONTEXT ============

export type CheckInDigest = {
  summary?: string;
  recentCheckIns: {
    date: string;
    energy: number | null;
    mood: number | null;
    stress: number | null;
    sleep_quality: number | null;
  }[];
  averages: {
    energy: number | null;
    mood: number | null;
    stress: number | null;
    sleep_quality: number | null;
  };
};

/**
 * Get digest of recent check-ins for AI context
 * 
 * @param userId - Database user ID (UUID)
 * @param days - Number of days to look back (default: 7, max: 90)
 * @returns CheckInDigest with summary, recent entries, and averages
 */
export async function getCheckInDigest(userId: string, days: number = 7): Promise<CheckInDigest> {
  // SECURITY: Validate and sanitize days parameter to prevent SQL injection
  const safeDays = Math.min(Math.max(Math.floor(Number(days) || 7), 1), 90);
  
  try {
    const checkIns = await query<{
      created_at: Date;
      energy: number | null;
      mood: number | null;
      stress: number | null;
      sleep_quality: number | null;
      notes: string | null;
    }>(
      `SELECT created_at, energy, mood, stress, sleep_quality, notes
       FROM check_ins
       WHERE user_id = $1 AND created_at >= NOW() - make_interval(days => $2)
       ORDER BY created_at DESC
       LIMIT 7`,
      [userId, safeDays]
    );

    if (!checkIns.length) {
      return {
        summary: undefined,
        recentCheckIns: [],
        averages: { energy: null, mood: null, stress: null, sleep_quality: null },
      };
    }

    // Calculate averages
    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v !== null);
      return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
    };

    const averages = {
      energy: avg(checkIns.map(c => c.energy)),
      mood: avg(checkIns.map(c => c.mood)),
      stress: avg(checkIns.map(c => c.stress)),
      sleep_quality: avg(checkIns.map(c => c.sleep_quality)),
    };

    const summaryParts: string[] = [];
    summaryParts.push(`${checkIns.length} check-ins in the last ${days} days`);
    
    if (averages.energy !== null) summaryParts.push(`Avg energy: ${averages.energy}/10`);
    if (averages.mood !== null) summaryParts.push(`Avg mood: ${averages.mood}/10`);
    if (averages.stress !== null) summaryParts.push(`Avg stress: ${averages.stress}/10`);
    if (averages.sleep_quality !== null) summaryParts.push(`Avg sleep: ${averages.sleep_quality}/10`);

    // Add latest notes if any
    const latestWithNotes = checkIns.find(c => c.notes);
    if (latestWithNotes?.notes) {
      summaryParts.push(`Latest note: "${latestWithNotes.notes}"`);
    }

    return {
      summary: summaryParts.join(". "),
      recentCheckIns: checkIns.map(c => ({
        date: c.created_at.toISOString().split('T')[0],
        energy: c.energy,
        mood: c.mood,
        stress: c.stress,
        sleep_quality: c.sleep_quality,
      })),
      averages,
    };
  } catch (error) {
    logger.debug("Check-in digest fetch failed", { error, userId });
    return {
      summary: undefined,
      recentCheckIns: [],
      averages: { energy: null, mood: null, stress: null, sleep_quality: null },
    };
  }
}

// ============ FULL USER CONTEXT FOR AI ============

export type FullUserContext = {
  habits?: HabitDigest;
  supplements?: SupplementDigest;
  checkIns?: CheckInDigest;
  experiments?: ExperimentDigest;
  careStatus?: CareStatusDigest;
  womensHealth?: WomensHealthDigest;
};

export async function getFullUserContext(userId: string): Promise<FullUserContext> {
  const [habits, supplements, checkIns, experiments, careStatus, womensHealth] = await Promise.all([
    getHabitDigest(userId),
    getSupplementDigest(userId),
    getCheckInDigest(userId),
    getExperimentDigest(userId),
    getCareStatusDigest(userId),
    getWomensHealthDigest(userId),
  ]);

  return {
    habits: habits.summary ? habits : undefined,
    supplements: supplements.summary ? supplements : undefined,
    checkIns: checkIns.summary ? checkIns : undefined,
    experiments: experiments.summary ? experiments : undefined,
    careStatus: careStatus.summary ? careStatus : undefined,
    womensHealth: womensHealth.summary ? womensHealth : undefined,
  };
}

export function buildContextSummary(context: FullUserContext): string {
  const parts: string[] = [];

  if (context.checkIns?.summary) {
    parts.push(`📊 RECENT CHECK-INS:\n${context.checkIns.summary}`);
  }

  if (context.habits?.summary) {
    parts.push(`✅ HABITS:\n${context.habits.summary}`);
  }

  if (context.supplements?.summary) {
    parts.push(`💊 SUPPLEMENTS:\n${context.supplements.summary}`);
  }

  if (context.experiments?.summary) {
    parts.push(`🧪 EXPERIMENTS:\n${context.experiments.summary}`);
  }

  if (context.careStatus?.summary) {
    parts.push(`🩺 CARE MODE:\n${context.careStatus.summary}`);
  }

  if (context.womensHealth?.summary) {
    parts.push(`🌸 CYCLE:\n${context.womensHealth.summary}`);
  }

  return parts.length > 0 
    ? `USER CONTEXT (use to personalize responses):\n\n${parts.join("\n\n")}`
    : "";
}




