import OpenAI from "openai";
import { env } from "../config/env.js";
import type { DietContent, MealAnalysis } from "../database/types.js";
import {
  SYSTEM_PROMPT,
  PARSE_DIET_PROMPT,
  ANALYZE_MEAL_PROMPT,
  buildDietQuestionPrompt,
  buildDailyReportPrompt,
  buildMealComparisonPrompt,
} from "../utils/prompts.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function parseDietFromText(text: string): Promise<DietContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PARSE_DIET_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as DietContent;
}

export async function parseDietFromImage(base64: string, mimeType: string): Promise<DietContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PARSE_DIET_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          { type: "text", text: "Extraia as informações nutricionais desta imagem de dieta." },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as DietContent;
}

export async function parseDietFromPDF(base64: string): Promise<DietContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PARSE_DIET_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: { file_data: `data:application/pdf;base64,${base64}` },
          } as unknown as OpenAI.Chat.ChatCompletionContentPart,
          { type: "text", text: "Extraia as informações nutricionais deste PDF de dieta." },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as DietContent;
}

export async function analyzeMealImage(base64: string, mimeType: string): Promise<MealAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ANALYZE_MEAL_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as MealAnalysis;
}

export async function answerDietQuestion(diet: DietContent, question: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildDietQuestionPrompt(diet, question) },
    ],
  });

  return response.choices[0].message.content || "Desculpe, não consegui processar sua pergunta.";
}

export async function generateDailyReport(
  diet: DietContent,
  consumed: { calories: number; protein: number; carbs: number; fat: number; mealCount: number }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildDailyReportPrompt(diet, consumed) },
    ],
  });

  return response.choices[0].message.content || "Não foi possível gerar o relatório.";
}

export async function generateMealFeedback(
  analysis: MealAnalysis,
  diet: DietContent,
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildMealComparisonPrompt(analysis, diet, dailyTotals) },
    ],
  });

  return response.choices[0].message.content || analysis.feedback;
}

