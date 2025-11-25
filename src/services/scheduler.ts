import cron from "node-cron";
import { sendDailyReports } from "../handlers/daily-report.js";

export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    try {
      await sendDailyReports();
    } catch (error) {
      console.error("Error in daily report scheduler:", error);
    }
  });

  console.log("Daily report scheduler started");
}

