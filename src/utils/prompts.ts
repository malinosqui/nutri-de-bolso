import type { DietContent, MealAnalysis } from "../database/types.js";

export const SYSTEM_PROMPT = `Você é o Nutri de Bolso, um assistente nutricional amigável e profissional no WhatsApp.
Você ajuda usuários a acompanhar sua dieta, analisar refeições e atingir seus objetivos nutricionais.
Seja sempre encorajador, mas honesto. Use linguagem simples e emojis moderadamente.
Responda sempre em português brasileiro.`;

export const PARSE_DIET_PROMPT = `Analise o texto/documento da dieta fornecido e extraia as informações nutricionais em formato JSON.

Extraia:
- Calorias diárias totais
- Macros diários (proteína, carboidratos, gordura em gramas)
- Lista de refeições com horários e alimentos sugeridos
- Notas ou observações importantes

Se não conseguir identificar valores específicos, faça estimativas razoáveis baseadas no contexto.

Responda APENAS com JSON válido no seguinte formato:
{
  "daily_calories": number,
  "daily_protein": number,
  "daily_carbs": number,
  "daily_fat": number,
  "meals": [
    {
      "name": "string",
      "time": "HH:MM" | null,
      "foods": ["string"],
      "calories": number | null,
      "protein": number | null,
      "carbs": number | null,
      "fat": number | null
    }
  ],
  "notes": ["string"] | null
}`;

export const ANALYZE_MEAL_PROMPT = `Analise a imagem desta refeição e identifique todos os alimentos visíveis.
Para cada alimento, estime a porção e os valores nutricionais.

Seja preciso nas estimativas de porções baseado no tamanho visual.
Considere métodos de preparo visíveis (frito, grelhado, cozido, etc).

Responda APENAS com JSON válido no seguinte formato:
{
  "foods": [
    {
      "name": "string",
      "portion": "string (ex: 100g, 1 unidade, 1 xícara)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "feedback": "string (comentário breve sobre a refeição)"
}`;

export function buildDietQuestionPrompt(diet: DietContent, question: string): string {
  return `Contexto da dieta do usuário:
- Meta diária: ${diet.daily_calories} kcal
- Proteína: ${diet.daily_protein}g | Carboidratos: ${diet.daily_carbs}g | Gordura: ${diet.daily_fat}g
- Refeições planejadas: ${diet.meals.map((m) => m.name).join(", ")}

Pergunta do usuário: ${question}

Responda de forma clara e útil, sempre relacionando com a dieta do usuário quando relevante.`;
}

export function buildDailyReportPrompt(
  diet: DietContent,
  consumed: { calories: number; protein: number; carbs: number; fat: number; mealCount: number }
): string {
  const caloriesDiff = consumed.calories - diet.daily_calories;
  const proteinDiff = consumed.protein - diet.daily_protein;
  const carbsDiff = consumed.carbs - diet.daily_carbs;
  const fatDiff = consumed.fat - diet.daily_fat;

  return `Gere um relatório diário motivacional e informativo.

Metas do dia:
- Calorias: ${diet.daily_calories} kcal
- Proteína: ${diet.daily_protein}g
- Carboidratos: ${diet.daily_carbs}g
- Gordura: ${diet.daily_fat}g

Consumido hoje (${consumed.mealCount} refeições registradas):
- Calorias: ${consumed.calories} kcal (${caloriesDiff >= 0 ? "+" : ""}${caloriesDiff})
- Proteína: ${consumed.protein}g (${proteinDiff >= 0 ? "+" : ""}${proteinDiff}g)
- Carboidratos: ${consumed.carbs}g (${carbsDiff >= 0 ? "+" : ""}${carbsDiff}g)
- Gordura: ${consumed.fat}g (${fatDiff >= 0 ? "+" : ""}${fatDiff}g)

Crie um resumo amigável com:
1. Parabéns ou encorajamento baseado no desempenho
2. Destaque do que foi bem
3. Sugestão para amanhã (se aplicável)
4. Use emojis moderadamente

Mantenha a resposta em no máximo 500 caracteres.`;
}

export function buildMealComparisonPrompt(
  analysis: MealAnalysis,
  diet: DietContent,
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number }
): string {
  const remaining = {
    calories: diet.daily_calories - dailyTotals.calories - analysis.total_calories,
    protein: diet.daily_protein - dailyTotals.protein - analysis.total_protein,
    carbs: diet.daily_carbs - dailyTotals.carbs - analysis.total_carbs,
    fat: diet.daily_fat - dailyTotals.fat - analysis.total_fat,
  };

  return `Analise esta refeição no contexto da dieta do usuário.

Refeição atual:
${analysis.foods.map((f) => `- ${f.name}: ${f.portion} (${f.calories} kcal)`).join("\n")}
Total: ${analysis.total_calories} kcal | P: ${analysis.total_protein}g | C: ${analysis.total_carbs}g | G: ${analysis.total_fat}g

Já consumido hoje: ${dailyTotals.calories} kcal

Após esta refeição, restam para hoje:
- Calorias: ${remaining.calories} kcal
- Proteína: ${remaining.protein}g
- Carboidratos: ${remaining.carbs}g
- Gordura: ${remaining.fat}g

Gere uma resposta curta (máx 400 caracteres) com:
1. Confirmação do registro
2. Como está o progresso do dia
3. Dica rápida se necessário
Use emojis moderadamente.`;
}

