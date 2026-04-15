import { publicProcedure, router } from "./trpc";
import { prisma } from "src/util/prisma";
import { z } from "zod";

const configRouter = router({
  get: publicProcedure.query(async () => {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    return { resolutionCutoff: config?.resolutionCutoff ?? null };
  }),

  setResolutionCutoff: publicProcedure
    .input(z.object({ date: z.date().nullable() }))
    .mutation(async ({ input }) => {
      return await prisma.config.upsert({
        where: { id: 1 },
        update: { resolutionCutoff: input.date },
        create: { id: 1, resolutionCutoff: input.date },
      });
    }),
});

export default configRouter;
