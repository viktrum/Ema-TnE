import { router } from "@/server/trpc/init";
import { healthRouter } from "./health";
import { scenarioRouter } from "./scenario";
import { reportRouter } from "./report";
import { dashboardRouter } from "./dashboard";
import { approvalRouter } from "./approval";
import { categorizeRouter } from "./categorize";

export const appRouter = router({
  health: healthRouter,
  scenario: scenarioRouter,
  report: reportRouter,
  dashboard: dashboardRouter,
  approval: approvalRouter,
  categorize: categorizeRouter,
});

export type AppRouter = typeof appRouter;
