/**
 * Habit Types
 * 
 * Types for habit tracking, streaks, and progress
 */

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type HabitCategory = 'health' | 'fitness' | 'mindfulness' | 'productivity' | 'nutrition' | 'sleep' | 'other';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  customDays?: number[];
  targetPerDay: number;
  reminderTime?: string;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completedCount: number;
  notes?: string;
  completedAt: string;
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalCompletions: number;
}

export interface DailyHabitStatus {
  habit: Habit;
  completedCount: number;
  targetCount: number;
  isComplete: boolean;
  streak: HabitStreak;
}

export interface HabitStats {
  totalHabits: number;
  activeHabits: number;
  completedToday: number;
  totalToday?: number;
  overallCompletionRate: number;
  currentBestStreak: number;
  totalCompletionsThisWeek: number;
}

export function getCategoryLabel(cat: HabitCategory): string {
  const labels: Record<HabitCategory, string> = {
    health: 'Health', fitness: 'Fitness', mindfulness: 'Mindfulness',
    productivity: 'Productivity', nutrition: 'Nutrition', sleep: 'Sleep', other: 'Other',
  };
  return labels[cat];
}

export function getCategoryColor(cat: HabitCategory): string {
  const colors: Record<HabitCategory, string> = {
    health: '#22f3c8', fitness: '#f97316', mindfulness: '#a855f7',
    productivity: '#3b82f6', nutrition: '#22c55e', sleep: '#6366f1', other: '#64748b',
  };
  return colors[cat];
}

export function shouldShowHabitToday(habit: Habit): boolean {
  const today = new Date().getDay();
  switch (habit.frequency) {
    case 'daily': return true;
    case 'weekdays': return today >= 1 && today <= 5;
    case 'weekends': return today === 0 || today === 6;
    case 'custom': return habit.customDays?.includes(today) ?? false;
    default: return true;
  }
}

export function calculateStreak(logs: HabitLog[], habit: Habit): number {
  if (logs.length === 0) return 0;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay();
    
    let shouldHaveHabit = habit.frequency === 'daily' ||
      (habit.frequency === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) ||
      (habit.frequency === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) ||
      (habit.frequency === 'custom' && habit.customDays?.includes(dayOfWeek));
    
    if (!shouldHaveHabit) continue;
    const log = sortedLogs.find(l => l.date === dateStr);
    if (log && log.completedCount >= habit.targetPerDay) { streak++; }
    else { if (i === 0) continue; break; }
  }
  return streak;
}

export const PRESET_HABITS: Partial<Habit>[] = [
  { name: 'Drink 8 glasses of water', category: 'health', targetPerDay: 8, icon: '💧', color: '#3b82f6' },
  { name: 'Take vitamins', category: 'health', targetPerDay: 1, icon: '💊', color: '#22c55e' },
  { name: '10,000 steps', category: 'health', targetPerDay: 1, icon: '👟', color: '#f97316' },
  { name: 'Morning workout', category: 'fitness', targetPerDay: 1, icon: '🏋️', color: '#ef4444' },
  { name: 'Stretch for 10 min', category: 'fitness', targetPerDay: 1, icon: '🧘', color: '#a855f7' },
  { name: 'Go for a walk', category: 'fitness', targetPerDay: 1, icon: '🚶', color: '#22f3c8' },
  { name: 'Meditate', category: 'mindfulness', targetPerDay: 1, icon: '🧘‍♂️', color: '#8b5cf6' },
  { name: 'Journal', category: 'mindfulness', targetPerDay: 1, icon: '📝', color: '#f59e0b' },
  { name: 'Gratitude practice', category: 'mindfulness', targetPerDay: 1, icon: '🙏', color: '#ec4899' },
  { name: 'No phone first hour', category: 'mindfulness', targetPerDay: 1, icon: '📵', color: '#64748b' },
  { name: 'Deep work session', category: 'productivity', targetPerDay: 1, icon: '🎯', color: '#3b82f6' },
  { name: 'Read for 30 min', category: 'productivity', targetPerDay: 1, icon: '📚', color: '#6366f1' },
  { name: 'Review daily goals', category: 'productivity', targetPerDay: 1, icon: '✅', color: '#22c55e' },
  { name: 'Eat vegetables', category: 'nutrition', targetPerDay: 3, icon: '🥗', color: '#22c55e' },
  { name: 'No sugar', category: 'nutrition', targetPerDay: 1, icon: '🚫', color: '#ef4444' },
  { name: 'Protein with each meal', category: 'nutrition', targetPerDay: 3, icon: '🥩', color: '#f97316' },
  { name: 'In bed by 10pm', category: 'sleep', targetPerDay: 1, icon: '🛏️', color: '#6366f1' },
  { name: 'No screens before bed', category: 'sleep', targetPerDay: 1, icon: '📱', color: '#64748b' },
  { name: 'Wind down routine', category: 'sleep', targetPerDay: 1, icon: '🌙', color: '#8b5cf6' },
];
