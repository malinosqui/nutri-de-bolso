import { supabase } from "./client.js";
import type { Diet, DietContent } from "./types.js";

export async function getDietByUserId(userId: string): Promise<Diet | null> {
  const { data, error } = await supabase
    .from("diets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data as Diet | null;
}

export async function createDiet(
  userId: string,
  content: DietContent,
  rawText: string | null
): Promise<Diet> {
  const { data, error } = await supabase
    .from("diets")
    .insert({
      user_id: userId,
      content,
      raw_text: rawText,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Diet;
}

export async function updateDiet(
  dietId: string,
  content: DietContent,
  rawText?: string
): Promise<Diet> {
  const updates: Record<string, unknown> = {
    content,
    updated_at: new Date().toISOString(),
  };

  if (rawText !== undefined) {
    updates.raw_text = rawText;
  }

  const { data, error } = await supabase
    .from("diets")
    .update(updates)
    .eq("id", dietId)
    .select()
    .single();

  if (error) throw error;
  return data as Diet;
}
