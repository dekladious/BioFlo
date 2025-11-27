/**
 * Nutrition Types
 * 
 * Types for meal logging, macros, and nutrition tracking
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  macros: Macros;
  isCustom?: boolean;
}

export interface MealEntry {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  macros: Macros;
  notes?: string;
}

export interface Meal {
  id: string;
  userId: string;
  type: MealType;
  time: string;
  entries: MealEntry[];
  totalMacros: Macros;
  notes?: string;
  createdAt: string;
}

export interface DailyNutrition {
  date: string;
  meals: Meal[];
  totalMacros: Macros;
  targetMacros?: Macros;
  waterIntakeMl?: number;
}

export interface NutritionGoals {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  waterMl?: number;
}

export function calculateMacros(food: FoodItem, qty: number): Macros {
  return {
    calories: Math.round(food.macros.calories * qty),
    protein: Math.round(food.macros.protein * qty * 10) / 10,
    carbs: Math.round(food.macros.carbs * qty * 10) / 10,
    fat: Math.round(food.macros.fat * qty * 10) / 10,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce((t, m) => ({
    calories: t.calories + m.calories,
    protein: t.protein + m.protein,
    carbs: t.carbs + m.carbs,
    fat: t.fat + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function getMealTypeLabel(type: MealType): string {
  const labels: Record<MealType, string> = {
    breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner',
    snack: 'Snack', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout',
  };
  return labels[type];
}

export const COMMON_FOODS: FoodItem[] = [
  { id: 'chicken-breast', name: 'Chicken Breast', servingSize: 100, servingUnit: 'g', macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { id: 'salmon', name: 'Salmon', servingSize: 100, servingUnit: 'g', macros: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
  { id: 'eggs', name: 'Eggs (whole)', servingSize: 50, servingUnit: 'g', macros: { calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 } },
  { id: 'greek-yogurt', name: 'Greek Yogurt', servingSize: 170, servingUnit: 'g', macros: { calories: 100, protein: 17, carbs: 6, fat: 0.7 } },
  { id: 'rice-white', name: 'White Rice', servingSize: 150, servingUnit: 'g', macros: { calories: 195, protein: 4, carbs: 42, fat: 0.4 } },
  { id: 'oats', name: 'Oats', servingSize: 40, servingUnit: 'g', macros: { calories: 150, protein: 5, carbs: 27, fat: 2.5 } },
  { id: 'sweet-potato', name: 'Sweet Potato', servingSize: 130, servingUnit: 'g', macros: { calories: 112, protein: 2, carbs: 26, fat: 0.1 } },
  { id: 'banana', name: 'Banana', servingSize: 118, servingUnit: 'g', macros: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 } },
  { id: 'avocado', name: 'Avocado', servingSize: 150, servingUnit: 'g', macros: { calories: 240, protein: 3, carbs: 13, fat: 22 } },
  { id: 'almonds', name: 'Almonds', servingSize: 28, servingUnit: 'g', macros: { calories: 164, protein: 6, carbs: 6, fat: 14 } },
  { id: 'whey-protein', name: 'Whey Protein', servingSize: 30, servingUnit: 'g', macros: { calories: 120, protein: 24, carbs: 3, fat: 1.5 } },
  { id: 'broccoli', name: 'Broccoli', servingSize: 100, servingUnit: 'g', macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
];

