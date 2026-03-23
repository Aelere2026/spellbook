import { publicProcedure, router } from "./trpc";
import { prisma } from "src/util/prisma";
import { tracked } from "@trpc/server";
import { z } from "zod";

const matchRouter = router({
  get: publicProcedure.query(async () => {
    return await prisma.match.findMany();
  }),
  search: publicProcedure
    .input(
      z.object({
        category: z.string(),
      }),
    )
    .query(async (opts) => {
      return await prisma.match.findMany({
        orderBy: {
          matchScore: "desc",
        },
      });
    }),
  onMarketAdd: publicProcedure
    .input(
      z.object({
        lastEventId: z.coerce.date().nullish(),
      }),
    )
    .subscription(async function* (opts) {
      let lastEventId = opts.input?.lastEventId ?? null;
      while (!opts.signal!.aborted) {
        const matches = await prisma.match.findMany({
          where: lastEventId
            ? {
                createdAt: {
                  gt: lastEventId,
                },
              }
            : undefined,
          orderBy: {
            createdAt: "asc",
          },
        });
        for (const match of matches) {
          yield tracked(match.createdAt.toJSON(), match);
          lastEventId = match.createdAt;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }),
});

export default matchRouter;
