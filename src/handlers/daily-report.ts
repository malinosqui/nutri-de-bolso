import { getUsersForDailyReport } from "../database/users.js";
import { getDietByUserId } from "../database/diets.js";
import { getDailyTotals } from "../database/meals.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { generateDailyReport } from "../services/openai.js";

export async function sendDailyReports(): Promise<void> {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const users = await getUsersForDailyReport(currentTime);

  for (const user of users) {
    try {
      await sendDailyReportToUser(user.id, user.phone);
    } catch (error) {
      console.error(`Error sending daily report to ${user.phone}:`, error);
    }
  }
}

async function sendDailyReportToUser(userId: string, phone: string): Promise<void> {
  const diet = await getDietByUserId(userId);
  if (!diet) {
    console.error(`No diet found for user ${userId}`);
    return;
  }

  const totals = await getDailyTotals(userId);

  const report = await generateDailyReport(diet.content, totals);

  const header = "📊 *Relatório do Dia*\n\n";
  await sendTextMessage(phone, header + report);
}

