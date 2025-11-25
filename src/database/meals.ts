import { supabase } from "./client.js";
import type { Meal, MealAnalysis } from "./types.js";

export async function createMeal(
  userId: string,
  analysis: MealAnalysis,
  imageUrl: string | null = null
): Promise<Meal> {
  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      image_url: imageUrl,
      analysis,
      calories: analysis.total_calories,
      protein: analysis.total_protein,
      carbs: analysis.total_carbs,
      fat: analysis.total_fat,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Meal;
}

export async function getMealsByUserIdToday(userId: string): Promise<Meal[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Meal[];
}

export async function getDailyTotals(userId: string): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}> {
  const meals = await getMealsByUserIdToday(userId);

  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
      mealCount: acc.mealCount + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 }
  );
}
