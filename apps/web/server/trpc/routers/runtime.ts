import { createRouter, protectedProcedure } from "../init";
import { runtime } from "../../runtime-context";

export const runtimeRouter = createRouter({
  capabilities: protectedProcedure.query(() => runtime),
});
