import { supabase } from "./client.js";
import type { OnboardingStep, User } from "./types.js";

export async function findUserByPhone(phone: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data as User | null;
}

export async function createUser(phone: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      phone,
      name: null,
      onboarding_step: "awaiting_name",
      report_time: null,
      timezone: "America/Sao_Paulo",
    })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function updateUser(
  userId: string,
  updates: {
    name?: string;
    onboarding_step?: OnboardingStep;
    report_time?: string;
    timezone?: string;
  }
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUsersForDailyReport(currentTime: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("onboarding_step", "completed")
    .eq("report_time", currentTime);

  if (error) throw error;
  return (data || []) as User[];
}
