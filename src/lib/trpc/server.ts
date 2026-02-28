import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";

const createCaller = createCallerFactory(appRouter);

export const serverClient = createCaller({});
