import { z } from "zod";

const envSchema = z.object({
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  PORT: z.string().default("3000"),
});

export const env = envSchema.parse(process.env);

