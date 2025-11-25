import { findUserByPhone } from "../database/users.js";
import { getDietByUserId } from "../database/diets.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { answerDietQuestion } from "../services/openai.js";
import { handleNewUser, handleOnboardingStep } from "./onboarding.js";
import { handleMealPhoto, handleDailySummaryRequest } from "./meal-analysis.js";
import type { ParsedMessage } from "../services/whatsapp.js";

const SUMMARY_KEYWORDS = ["resumo", "como estou", "quanto comi", "progresso", "status"];
const HELP_MESSAGE = `📚 *Comandos disponíveis:*

📸 Envie uma *foto* da refeição para registrar
📊 Digite *"resumo"* para ver o progresso do dia
❓ Faça *perguntas* sobre sua dieta

Exemplo de perguntas:
• "Posso comer pizza hoje?"
• "Quantas calorias faltam?"
• "O que devo comer no jantar?"`;

export async function handleMessage(message: ParsedMessage): Promise<void> {
  try {
    const user = await findUserByPhone(message.from);

    if (!user) {
      await handleNewUser(message.from);
      return;
    }

    if (user.onboarding_step !== "completed") {
      await handleOnboardingStep(user, message);
      return;
    }

    if (message.type === "image" && message.mediaId) {
      await handleMealPhoto(user, message.mediaId);
      return;
    }

    if (message.type === "text" && message.text) {
      const text = message.text.toLowerCase().trim();

      if (text === "ajuda" || text === "help") {
        await sendTextMessage(user.phone, HELP_MESSAGE);
        return;
      }

      if (SUMMARY_KEYWORDS.some((keyword) => text.includes(keyword))) {
        await handleDailySummaryRequest(user);
        return;
      }

      const diet = await getDietByUserId(user.id);
      if (!diet) {
        await sendTextMessage(
          user.phone,
          "❌ Não encontrei sua dieta. Por favor, envie novamente."
        );
        return;
      }

      const answer = await answerDietQuestion(diet.content, message.text);
      await sendTextMessage(user.phone, answer);
      return;
    }

    if (message.type === "document") {
      await sendTextMessage(
        user.phone,
        "📄 Para atualizar sua dieta, me envie um PDF ou imagem. Para registrar refeições, envie fotos!"
      );
      return;
    }

    await sendTextMessage(
      user.phone,
      "🤔 Não entendi. Envie uma foto da refeição ou digite 'ajuda' para ver os comandos."
    );
  } catch (error) {
    console.error("Error handling message:", error);
    await sendTextMessage(
      message.from,
      "❌ Ops! Algo deu errado. Tente novamente em alguns segundos."
    );
  }
}

