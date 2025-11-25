export type OnboardingStep = "new" | "awaiting_name" | "awaiting_diet" | "awaiting_report_time" | "completed";

export interface DietContent {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  meals: {
    name: string;
    time?: string;
    foods: string[];
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }[];
  notes?: string[];
}

export interface MealAnalysis {
  foods: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  feedback: string;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  onboarding_step: OnboardingStep;
  report_time: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Diet {
  id: string;
  user_id: string;
  content: DietContent;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  image_url: string | null;
  analysis: MealAnalysis;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}
