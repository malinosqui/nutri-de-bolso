import { createUser, updateUser, findUserByPhone } from "../database/users.js";
import { createDiet } from "../database/diets.js";
import { sendTextMessage, getMediaAsBase64 } from "../services/whatsapp.js";
import { parseDietFromText, parseDietFromImage, parseDietFromPDF } from "../services/openai.js";
import type { ParsedMessage } from "../services/whatsapp.js";
import type { User } from "../database/types.js";

const WELCOME_MESSAGE = `👋 Olá! Eu sou o *Nutri de Bolso*, seu assistente nutricional no WhatsApp!

Vou te ajudar a acompanhar sua dieta e atingir seus objetivos.

Para começar, qual é o seu nome?`;

const ASK_DIET_MESSAGE = (name: string) =>
  `Prazer, ${name}! 🎉

Agora preciso conhecer sua dieta. Você pode:
📄 Enviar um *PDF* da sua dieta
📸 Enviar uma *foto/print* da dieta
✍️ Ou *digitar* as informações

Mande como preferir!`;

const ASK_REPORT_TIME_MESSAGE = `✅ Dieta registrada com sucesso!

Agora, a que horas você quer receber seu *relatório diário*?

Envie no formato HH:MM (ex: 21:00)`;

const ONBOARDING_COMPLETE_MESSAGE = (time: string) =>
  `🎉 Tudo pronto, ${time}!

A partir de agora você pode:
📸 Enviar *fotos das refeições* para eu calcular as calorias
❓ Fazer *perguntas* sobre sua dieta
📊 Receber um *relatório diário* no horário que você escolheu

Bora começar? Manda a foto da sua próxima refeição! 💪`;

export async function handleNewUser(phone: string): Promise<void> {
  await createUser(phone);
  await sendTextMessage(phone, WELCOME_MESSAGE);
}

export async function handleOnboardingStep(user: User, message: ParsedMessage): Promise<boolean> {
  switch (user.onboarding_step) {
    case "awaiting_name":
      return handleNameStep(user, message);
    case "awaiting_diet":
      return handleDietStep(user, message);
    case "awaiting_report_time":
      return handleReportTimeStep(user, message);
    default:
      return false;
  }
}

async function handleNameStep(user: User, message: ParsedMessage): Promise<boolean> {
  if (message.type !== "text" || !message.text) {
    await sendTextMessage(user.phone, "Por favor, me envie seu nome em texto.");
    return true;
  }

  const name = message.text.trim();
  if (name.length < 2) {
    await sendTextMessage(user.phone, "Nome muito curto. Qual é o seu nome?");
    return true;
  }

  await updateUser(user.id, { name, onboarding_step: "awaiting_diet" });
  await sendTextMessage(user.phone, ASK_DIET_MESSAGE(name));
  return true;
}

async function handleDietStep(user: User, message: ParsedMessage): Promise<boolean> {
  try {
    let dietContent;
    let rawText: string | null = null;

    if (message.type === "text" && message.text) {
      rawText = message.text;
      await sendTextMessage(user.phone, "📊 Analisando sua dieta...");
      dietContent = await parseDietFromText(message.text);
    } else if (message.type === "image" && message.mediaId) {
      await sendTextMessage(user.phone, "📊 Analisando a imagem da sua dieta...");
      const { base64, mimeType } = await getMediaAsBase64(message.mediaId);
      dietContent = await parseDietFromImage(base64, mimeType);
    } else if (message.type === "document" && message.mediaId) {
      if (!message.mimeType?.includes("pdf")) {
        await sendTextMessage(user.phone, "Por favor, envie um arquivo PDF.");
        return true;
      }
      await sendTextMessage(user.phone, "📊 Analisando o PDF da sua dieta...");
      const { base64 } = await getMediaAsBase64(message.mediaId);
      dietContent = await parseDietFromPDF(base64);
    } else {
      await sendTextMessage(
        user.phone,
        "Por favor, envie sua dieta como texto, imagem ou PDF."
      );
      return true;
    }

    await createDiet(user.id, dietContent, rawText);
    await updateUser(user.id, { onboarding_step: "awaiting_report_time" });

    const summary = `📋 *Dieta identificada:*
• Calorias: ${dietContent.daily_calories} kcal/dia
• Proteína: ${dietContent.daily_protein}g
• Carboidratos: ${dietContent.daily_carbs}g
• Gordura: ${dietContent.daily_fat}g
• Refeições: ${dietContent.meals.length}`;

    await sendTextMessage(user.phone, summary);
    await sendTextMessage(user.phone, ASK_REPORT_TIME_MESSAGE);
    return true;
  } catch (error) {
    console.error("Error parsing diet:", error);
    await sendTextMessage(
      user.phone,
      "❌ Não consegui entender sua dieta. Tente enviar de outra forma ou com mais detalhes."
    );
    return true;
  }
}

async function handleReportTimeStep(user: User, message: ParsedMessage): Promise<boolean> {
  if (message.type !== "text" || !message.text) {
    await sendTextMessage(user.phone, "Por favor, envie o horário no formato HH:MM (ex: 21:00)");
    return true;
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const match = message.text.trim().match(timeRegex);

  if (!match) {
    await sendTextMessage(
      user.phone,
      "Formato inválido. Envie no formato HH:MM (ex: 21:00)"
    );
    return true;
  }

  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const reportTime = `${hours}:${minutes}`;

  await updateUser(user.id, { report_time: reportTime, onboarding_step: "completed" });
  await sendTextMessage(user.phone, ONBOARDING_COMPLETE_MESSAGE(reportTime));
  return true;
}

