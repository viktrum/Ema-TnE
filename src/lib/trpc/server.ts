import { createCallerFactory, createContext } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";

const createCaller = createCallerFactory(appRouter);

export async function getServerClient() {
  const ctx = await createContext();
  return createCaller(ctx);
}
