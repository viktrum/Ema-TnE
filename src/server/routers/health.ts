import { publicProcedure, router } from "@/server/trpc/init";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return { status: "ok" };
  }),
});
