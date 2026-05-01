import { publicProcedure, router } from "./trpc";
import { prisma } from "../util/prisma";
import { z } from "zod";

// Ensures a single BotConfig row always exists (id = 1)
async function getOrCreateConfig() {
  const existing = await prisma.botConfig.findFirst();
  if (existing) return existing;
  return await prisma.botConfig.create({ data: {} });
}

const configRouter = router({
  // Get current bot config
  get: publicProcedure.query(async () => {
    return await getOrCreateConfig();
  }),

  // Update bot config
  update: publicProcedure
    .input(
      z.object({
        usePresetAlgo: z.boolean().optional(),
        manualShares: z.number().min(1).max(10000).optional(),
        maxShares: z.number().min(1).max(10000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const config = await getOrCreateConfig();
      return await prisma.botConfig.update({
        where: { id: config.id },
        data: {
          ...(input.usePresetAlgo !== undefined && { usePresetAlgo: input.usePresetAlgo }),
          ...(input.manualShares !== undefined && { manualShares: input.manualShares }),
          ...(input.maxShares !== undefined && { maxShares: input.maxShares }),
        },
      });
    }),
});

export default configRouter;