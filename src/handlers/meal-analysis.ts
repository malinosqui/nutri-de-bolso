import { getDietByUserId } from "../database/diets.js";
import { createMeal, getDailyTotals } from "../database/meals.js";
import { sendTextMessage, getMediaAsBase64 } from "../services/whatsapp.js";
import { analyzeMealImage, generateMealFeedback } from "../services/openai.js";
import type { User } from "../database/types.js";

export async function handleMealPhoto(user: User, mediaId: string): Promise<void> {
  try {
    await sendTextMessage(user.phone, "🍽️ Analisando sua refeição...");

    const { base64, mimeType } = await getMediaAsBase64(mediaId);
    const analysis = await analyzeMealImage(base64, mimeType);

    const diet = await getDietByUserId(user.id);
    if (!diet) {
      await sendTextMessage(
        user.phone,
        "❌ Não encontrei sua dieta. Por favor, configure novamente."
      );
      return;
    }

    const dailyTotals = await getDailyTotals(user.id);
    await createMeal(user.id, analysis);

    const feedback = await generateMealFeedback(analysis, diet.content, dailyTotals);

    const foodsList = analysis.foods
      .map((f) => `• ${f.name} (${f.portion}): ${f.calories} kcal`)
      .join("\n");

    const message = `📊 *Refeição registrada!*

${foodsList}

*Total:* ${analysis.total_calories} kcal
P: ${analysis.total_protein}g | C: ${analysis.total_carbs}g | G: ${analysis.total_fat}g

---
${feedback}`;

    await sendTextMessage(user.phone, message);
  } catch (error) {
    console.error("Error analyzing meal:", error);
    await sendTextMessage(
      user.phone,
      "❌ Não consegui analisar a imagem. Tente enviar uma foto mais clara do prato."
    );
  }
}

export async function handleDailySummaryRequest(user: User): Promise<void> {
  try {
    const diet = await getDietByUserId(user.id);
    if (!diet) {
      await sendTextMessage(user.phone, "❌ Dieta não encontrada.");
      return;
    }

    const totals = await getDailyTotals(user.id);
    const remaining = {
      calories: diet.content.daily_calories - totals.calories,
      protein: diet.content.daily_protein - totals.protein,
      carbs: diet.content.daily_carbs - totals.carbs,
      fat: diet.content.daily_fat - totals.fat,
    };

    const progress = Math.round((totals.calories / diet.content.daily_calories) * 100);

    const message = `📊 *Resumo do dia*

*Consumido:*
• Calorias: ${totals.calories} / ${diet.content.daily_calories} kcal (${progress}%)
• Proteína: ${totals.protein}g / ${diet.content.daily_protein}g
• Carboidratos: ${totals.carbs}g / ${diet.content.daily_carbs}g
• Gordura: ${totals.fat}g / ${diet.content.daily_fat}g

*Restante:*
• Calorias: ${remaining.calories} kcal
• Proteína: ${remaining.protein}g
• Carboidratos: ${remaining.carbs}g
• Gordura: ${remaining.fat}g

*Refeições registradas:* ${totals.mealCount}`;

    await sendTextMessage(user.phone, message);
  } catch (error) {
    console.error("Error getting daily summary:", error);
    await sendTextMessage(user.phone, "❌ Erro ao gerar resumo.");
  }
}

