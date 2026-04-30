import { tracked } from "@trpc/server"
import { z } from "zod"

import { router } from "./"
import { protectedProcedure } from "./procedures"
import { prisma } from "../util/prisma"


const matchRouter = router({
  get: protectedProcedure.query(async () => {
    return await prisma.match.findMany();
  }),
  search: protectedProcedure
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
  onMarketAdd: protectedProcedure
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
