import { publicProcedure, router } from "./trpc";
import { prisma } from "src/util/prisma";
import { tracked } from "@trpc/server";
import { z } from "zod";

const arbitrageRouter = router({
  get: publicProcedure.query(async () => {
    return await prisma.arbitrage.findMany({
      orderBy: {
        detectionTime: "desc",
      },
    });
  }),

  stats: publicProcedure.query(async () => {
    const arbitrages = await prisma.arbitrage.findMany({
      orderBy: {
        detectionTime: "asc",
      },
    });

    if (arbitrages.length === 0) {
      return {
        gainLoss: 0,
        opportunities: 0,
        frequency: 0,
        avgTradeTime: 0,
        profit: 0,
        totalFeeLoss: 0,
        avgRoi: 0,
        avgSlippage: 0,
        exposure: 0,
        yesPrice: 0,
        noPrice: 0,
      };
    }

    let totalYes = 0;
    let totalNo = 0;

    let gains = 0;
    let losses = 0;
    let totalDurationMs = 0;

    let totalProfit = 0;
    let totalFeeLoss = 0;
    let totalSlippage = 0;
    let totalGrossProfit = 0;

    let earliestDetection = new Date(arbitrages[0].detectionTime);
    let latestExecution = new Date(arbitrages[0].executionTime);

    for (const arbitrage of arbitrages) {
      const yesPrice = Number(arbitrage.yesPrice);
      const noPrice = Number(arbitrage.noPrice);
      const netProfit = Number(arbitrage.netProfit);
      const grossProfit = Number(arbitrage.grossProfit);
      const totalFee = Number(arbitrage.totalFee);
      const estimatedSlippage = Number(arbitrage.estimatedSlippage);

      if (netProfit > 0) gains++;
      if (netProfit < 0) losses++;

      totalYes += yesPrice;
      totalNo += noPrice;
      totalProfit += netProfit;
      totalFeeLoss += totalFee;
      totalSlippage += estimatedSlippage;
      totalGrossProfit += grossProfit;

      const detection = new Date(arbitrage.detectionTime);
      const execution = new Date(arbitrage.executionTime);

      totalDurationMs += execution.getTime() - detection.getTime();

      if (detection < earliestDetection) {
        earliestDetection = detection;
      }

      if (execution > latestExecution) {
        latestExecution = execution;
      }
    }

    const opportunities = arbitrages.length;
    const gainLoss = losses === 0 ? gains : gains / losses;

    const totalHours =
      (latestExecution.getTime() - earliestDetection.getTime()) /
      (1000 * 60 * 60);

    const frequency =
      totalHours > 0 ? opportunities / totalHours : opportunities;

    const avgTradeTime = totalDurationMs / arbitrages.length;

    const avgSlippage = totalSlippage / arbitrages.length;

    const exposure = totalGrossProfit;

    const avgRoi = (totalProfit / (totalYes + totalNo)) * (100) ;

    return {
      gainLoss: Number(gainLoss.toFixed(3)),
      opportunities,
      frequency: Number(frequency.toFixed(3)),
      avgTradeTime: Number(avgTradeTime.toFixed(3)),
      profit: Number(totalProfit.toFixed(3)),
      totalFeeLoss: Number(totalFeeLoss.toFixed(3)),
      avgRoi: Number(avgRoi.toFixed(3)),
      avgSlippage: Number(avgSlippage.toFixed(4)),
      exposure: Number(exposure.toFixed(3)),
    };
  }),

  search: publicProcedure
    .input(
      z.object({
        category: z.string(),
      })
    )
    .query(async (_opts) => {
      return await prisma.arbitrage.findMany({
        orderBy: {
          detectionTime: "desc",
        },
      });
    }),

  getWithMarkets: publicProcedure.query(async () => {
    const arbitrages = await prisma.arbitrage.findMany({
      orderBy: { detectionTime: "desc" },
      include: {
        match: {
          include: {
            polymarketMarket: { select: { resolutionDate: true } },
            kalshiMarket: { select: { resolutionDate: true } },
          },
        },
      },
    });

    return arbitrages.map((a) => ({
      ...a,
      resolutionDate: new Date(
        Math.max(
          a.match.polymarketMarket.resolutionDate.getTime(),
          a.match.kalshiMarket.resolutionDate.getTime(),
        ),
      ),
    }));
  }),

  onMarketAdd: publicProcedure
    .input(
      z.object({
        lastEventId: z.coerce.date().nullish(),
      })
    )
    .subscription(async function* (opts) {
      let lastEventId = opts.input?.lastEventId ?? null;

      while (!opts.signal!.aborted) {
        const arbitrages = await prisma.arbitrage.findMany({
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

        for (const arbitrage of arbitrages) {
          yield tracked(arbitrage.createdAt.toJSON(), arbitrage);
          lastEventId = arbitrage.createdAt;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }),
});

export default arbitrageRouter;