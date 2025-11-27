/**
 * Schedule Types
 * 
 * Types for the daily schedule and block system
 */

export type BlockType = 
  | "wake"
  | "sleep" 
  | "meal"
  | "training"
  | "work"
  | "deep_work"
  | "rest"
  | "wind_down"
  | "supplement"
  | "habit"
  | "custom";

export interface ScheduleBlock {
  id: string;
  title: string;
  description?: string;
  blockType: BlockType;
  startTime: string; // HH:mm format
  endTime?: string;  // HH:mm format
  completed: boolean;
  completedAt?: string;
  skipped: boolean;
  linkedPage?: string;
  priority?: "low" | "medium" | "high";
  source?: "ai" | "user" | "protocol";
}

export interface DailySchedule {
  id: string;
  date: string; // YYYY-MM-DD
  wakeTime: string;
  sleepTime: string;
  goalMode?: string;
  readinessScore?: number;
  aiRationale?: string;
  generatedFrom: "ai" | "template" | "user";
  lastModifiedBy: "ai" | "user";
  blocks: ScheduleBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  wakeTime: string;
  sleepTime: string;
  blocks: Omit<ScheduleBlock, "id" | "completed" | "completedAt" | "skipped">[];
}

export interface UserSchedulePreferences {
  defaultWakeTime: string;
  defaultSleepTime: string;
  workStartTime?: string;
  workEndTime?: string;
  preferredMealTimes?: string[];
  trainingDays?: number[]; // 0-6, Sunday = 0
  preferredTrainingTime?: string;
}

export interface PlanGenerationContext {
  userId: string;
  date: string;
  goalMode: string;
  readinessScore: number | null;
  preferences: UserSchedulePreferences | null;
  hasWearableData: boolean;
  recentCheckIns: number;
}

export interface GeneratedPlan {
  schedule: DailySchedule;
  summary: {
    focus: string;
    keyMessage: string;
    warnings?: string[];
    opportunities?: string[];
  };
}

// Helper functions
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(totalMinutes);
}

