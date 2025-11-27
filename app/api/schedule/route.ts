/**
 * Schedule API Route
 * 
 * GET /api/schedule?date=YYYY-MM-DD&refresh=1
 * PATCH /api/schedule { blockId, action: "complete" | "skip" | "update", updates? }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import type { ScheduleBlock, DailySchedule } from "@/lib/types/schedule";
import { getQuickPersonalization, type PersonalizationContext } from "@/lib/ai/planPersonalizer";

// In-memory cache for schedules (would be database in production)
const scheduleCache = new Map<string, DailySchedule>();

function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateScheduleId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a default daily schedule based on typical patterns
function generateDefaultSchedule(date: string, goalMode: string = "NORMAL"): DailySchedule {
  const now = new Date();
  const blocks: ScheduleBlock[] = [];
  
  // Default wake/sleep times
  const wakeTime = "06:30";
  const sleepTime = "22:30";
  
  // Wake routine
  blocks.push({
    id: generateBlockId(),
    title: "Morning wake-up",
    description: "Start the day with light exposure and hydration",
    blockType: "wake",
    startTime: wakeTime,
    endTime: "07:00",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Morning supplements
  blocks.push({
    id: generateBlockId(),
    title: "Morning supplements",
    description: "Take your morning stack with water",
    blockType: "supplement",
    startTime: "07:00",
    endTime: "07:15",
    completed: false,
    skipped: false,
    priority: "medium",
    source: "ai",
  });
  
  // Breakfast
  blocks.push({
    id: generateBlockId(),
    title: "Breakfast",
    description: "Protein-forward meal to fuel the morning",
    blockType: "meal",
    startTime: "07:30",
    endTime: "08:00",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Deep work block (morning)
  blocks.push({
    id: generateBlockId(),
    title: "Deep work session",
    description: "Protected focus time for your most important work",
    blockType: "deep_work",
    startTime: "08:30",
    endTime: "11:00",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Movement break
  blocks.push({
    id: generateBlockId(),
    title: "Movement break",
    description: "5-10 min walk or stretching",
    blockType: "rest",
    startTime: "11:00",
    endTime: "11:15",
    completed: false,
    skipped: false,
    priority: "medium",
    source: "ai",
  });
  
  // Lunch
  blocks.push({
    id: generateBlockId(),
    title: "Lunch",
    description: "Balanced meal with vegetables and protein",
    blockType: "meal",
    startTime: "12:30",
    endTime: "13:00",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Afternoon work
  blocks.push({
    id: generateBlockId(),
    title: "Afternoon work",
    description: "Meetings, collaboration, or tactical work",
    blockType: "work",
    startTime: "13:30",
    endTime: "17:00",
    completed: false,
    skipped: false,
    priority: "medium",
    source: "ai",
  });
  
  // Training (if not recovery mode)
  if (goalMode !== "RECOVERY") {
    blocks.push({
      id: generateBlockId(),
      title: "Training session",
      description: goalMode === "GROWTH" 
        ? "Push intensity today - your readiness supports it"
        : "Moderate intensity training",
      blockType: "training",
      startTime: "17:30",
      endTime: "18:30",
      completed: false,
      skipped: false,
      linkedPage: "/training",
      priority: "high",
      source: "ai",
    });
  } else {
    // Light movement for recovery
    blocks.push({
      id: generateBlockId(),
      title: "Recovery movement",
      description: "Light walk, stretching, or yoga",
      blockType: "rest",
      startTime: "17:30",
      endTime: "18:00",
      completed: false,
      skipped: false,
      priority: "medium",
      source: "ai",
    });
  }
  
  // Dinner
  blocks.push({
    id: generateBlockId(),
    title: "Dinner",
    description: "Light dinner to support recovery",
    blockType: "meal",
    startTime: "19:00",
    endTime: "19:30",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Wind down
  blocks.push({
    id: generateBlockId(),
    title: "Wind down routine",
    description: "Dim lights, reduce screen time, prepare for sleep",
    blockType: "wind_down",
    startTime: "21:30",
    endTime: "22:00",
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  // Sleep
  blocks.push({
    id: generateBlockId(),
    title: "Sleep",
    description: "Target 7-8 hours of quality sleep",
    blockType: "sleep",
    startTime: sleepTime,
    completed: false,
    skipped: false,
    priority: "high",
    source: "ai",
  });
  
  return {
    id: generateScheduleId(),
    date,
    wakeTime,
    sleepTime,
    goalMode,
    readinessScore: 65, // Default estimate
    aiRationale: "Generated based on your preferences and typical daily patterns.",
    generatedFrom: "ai",
    lastModifiedBy: "ai",
    blocks,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(createErrorResponse("Unauthorized", 401), { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const refresh = searchParams.get("refresh") === "1";
    
    const cacheKey = `${userId}_${date}`;
    
    // Return cached schedule if available and not forcing refresh
    if (!refresh && scheduleCache.has(cacheKey)) {
      const cached = scheduleCache.get(cacheKey)!;
      logger.debug("Returning cached schedule", { userId, date, requestId });
      
      // Still personalize the summary even for cached schedules
      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const cachedContext: PersonalizationContext = {
        userId,
        readinessScore: cached.readinessScore,
        goalMode: cached.goalMode || "NORMAL",
        hasWearable: false,
        trainingDay: cached.blocks.some(b => b.blockType === "training"),
        weekdayName: weekdays[new Date(date).getDay()],
      };
      const cachedPersonalization = getQuickPersonalization(cachedContext);
      
      return NextResponse.json(createSuccessResponse({
        schedule: cached,
        summary: {
          focus: cachedPersonalization.focusTheme,
          keyMessage: cachedPersonalization.keyMessage,
          dayRationale: cachedPersonalization.dayRationale,
        },
      }));
    }
    
    // Try to get user preferences and goal mode
    let goalMode = "NORMAL";
    try {
      const modeResponse = await fetch(new URL("/api/mode", request.url).toString(), {
        headers: { cookie: request.headers.get("cookie") || "" },
      });
      if (modeResponse.ok) {
        const modeData = await modeResponse.json();
        goalMode = modeData.data?.mode || "NORMAL";
      }
    } catch (err) {
      logger.warn("Failed to fetch goal mode for schedule", { error: err, requestId });
    }
    
    // Generate schedule
    const schedule = generateDefaultSchedule(date, goalMode);
    scheduleCache.set(cacheKey, schedule);
    
    logger.info("Generated new schedule", { userId, date, goalMode, requestId });
    
    // Get personalized summary
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const personalizationContext: PersonalizationContext = {
      userId,
      readinessScore: schedule.readinessScore,
      goalMode,
      hasWearable: false, // Would come from user profile
      trainingDay: schedule.blocks.some(b => b.blockType === "training"),
      weekdayName: weekdays[new Date(date).getDay()],
    };
    
    const personalization = getQuickPersonalization(personalizationContext);
    
    return NextResponse.json(createSuccessResponse({
      schedule,
      summary: {
        focus: personalization.focusTheme,
        keyMessage: personalization.keyMessage,
        dayRationale: personalization.dayRationale,
      },
    }));
    
  } catch (error) {
    logger.error("Schedule API error", { error, requestId });
    return NextResponse.json(
      createErrorResponse("Failed to load schedule", 500),
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(createErrorResponse("Unauthorized", 401), { status: 401 });
    }
    
    const body = await request.json();
    const { blockId, action, updates } = body as {
      blockId: string;
      action: "complete" | "skip" | "update";
      updates?: { title?: string; description?: string; startTime?: string };
    };
    
    if (!blockId || !action) {
      return NextResponse.json(
        createErrorResponse("blockId and action are required", 400),
        { status: 400 }
      );
    }
    
    // Find the schedule containing this block
    let targetSchedule: DailySchedule | null = null;
    let cacheKey: string | null = null;
    
    for (const [key, schedule] of scheduleCache.entries()) {
      if (key.startsWith(userId)) {
        const block = schedule.blocks.find(b => b.id === blockId);
        if (block) {
          targetSchedule = schedule;
          cacheKey = key;
          break;
        }
      }
    }
    
    if (!targetSchedule || !cacheKey) {
      return NextResponse.json(
        createErrorResponse("Block not found", 404),
        { status: 404 }
      );
    }
    
    // Update the block
    const updatedBlocks = targetSchedule.blocks.map(block => {
      if (block.id !== blockId) return block;
      
      switch (action) {
        case "complete":
          return { ...block, completed: true, completedAt: new Date().toISOString() };
        case "skip":
          return { ...block, skipped: true };
        case "update":
          return { ...block, ...updates };
        default:
          return block;
      }
    });
    
    const updatedSchedule: DailySchedule = {
      ...targetSchedule,
      blocks: updatedBlocks,
      lastModifiedBy: "user",
      updatedAt: new Date().toISOString(),
    };
    
    scheduleCache.set(cacheKey, updatedSchedule);
    
    logger.info("Updated schedule block", { userId, blockId, action, requestId });
    
    return NextResponse.json(createSuccessResponse({
      schedule: updatedSchedule,
      message: `Block ${action}d successfully`,
    }));
    
  } catch (error) {
    logger.error("Schedule PATCH error", { error, requestId });
    return NextResponse.json(
      createErrorResponse("Failed to update schedule", 500),
      { status: 500 }
    );
  }
}

