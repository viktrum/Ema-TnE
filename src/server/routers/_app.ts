import { router } from "@/server/trpc/init";
import { healthRouter } from "./health";
import { scenarioRouter } from "./scenario";
import { reportRouter } from "./report";

export const appRouter = router({
  health: healthRouter,
  scenario: scenarioRouter,
  report: reportRouter,
});

export type AppRouter = typeof appRouter;
