import { publicProcedure, router } from "./trpc";
import { prisma } from "../util/prisma";
import { tracked } from "@trpc/server";
import { z } from "zod";

const arbitrageRouter = router({
  // Get arbitrages with pagination (100 per page default)
  get: publicProcedure
    .input(
      z.object({
        // current page number
        page: z.number().min(1).default(1),

        // number of rows returned per page
        limit: z.number().min(1).max(100).default(100),
      }),
    )
    .query(async ({ input }) => {
      const page = input.page;
      const limit = input.limit;

      // number of records to skip for pagination
      const skip = (page - 1) * limit;

      // fetch current page rows + total row count in parallel
      const [rows, total] = await Promise.all([
        prisma.arbitrage.findMany({
          orderBy: {
            // newest trades first
            detectionTime: "desc",
          },
          skip,
          take: limit,
        }),

        // total number of arbitrages for total pages
        prisma.arbitrage.count(),
      ]);

      return {
        rows,
        total,
        page,

        // used by frontend for pagination controls
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Compute dashboard summary statistics
  stats: publicProcedure.query(async () => {
    const arbitrages = await prisma.arbitrage.findMany({
      orderBy: {
        // oldest first for time-series calculations
        detectionTime: "asc",
      },
    });

    // default values if no trades exist
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

    // aggregate accumulators
    let totalYes = 0;
    let totalNo = 0;

    let gains = 0;
    let losses = 0;
    let totalDurationMs = 0;

    let totalProfit = 0;
    let totalFeeLoss = 0;
    let totalSlippage = 0;
    let totalGrossProfit = 0;

    // initialize time range
    let earliestDetection = new Date(arbitrages[0].detectionTime);
    let latestExecution = new Date(arbitrages[0].executionTime);

    // iterate through all arbitrages for metrics
    for (const arbitrage of arbitrages) {
      const yesPrice = Number(arbitrage.yesPrice);
      const noPrice = Number(arbitrage.noPrice);
      const netProfit = Number(arbitrage.netProfit);
      const grossProfit = Number(arbitrage.grossProfit);
      const totalFee = Number(arbitrage.totalFee);
      const estimatedSlippage = Number(arbitrage.estimatedSlippage);

      // count winning vs losing trades
      if (netProfit > 0) gains++;
      if (netProfit < 0) losses++;

      // aggregate values
      totalYes += yesPrice;
      totalNo += noPrice;
      totalProfit += netProfit;
      totalFeeLoss += totalFee;
      totalSlippage += estimatedSlippage;
      totalGrossProfit += grossProfit;

      const detection = new Date(arbitrage.detectionTime);
      const execution = new Date(arbitrage.executionTime);

      // accumulate trade durations
      totalDurationMs += execution.getTime() - detection.getTime();

      // track earliest opportunity
      if (detection < earliestDetection) {
        earliestDetection = detection;
      }

      // track latest execution
      if (execution > latestExecution) {
        latestExecution = execution;
      }
    }

    // number of opportunities found
    const opportunities = arbitrages.length;

    // gain/loss ratio
    const gainLoss = losses === 0 ? gains : gains / losses;

    // total hours covered by sample
    const totalHours =
      (latestExecution.getTime() - earliestDetection.getTime()) /
      (1000 * 60 * 60);

    // arbitrage opportunities per hour
    const frequency =
      totalHours > 0 ? opportunities / totalHours : opportunities;

    // average execution duration
    const avgTradeTime = totalDurationMs / arbitrages.length;

    // average slippage
    const avgSlippage = totalSlippage / arbitrages.length;

    // gross capital exposure
    const exposure = totalGrossProfit;

    // average return on investment
    const avgRoi = (totalProfit / (totalYes + totalNo)) * 100;

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

  // Search endpoint (currently returns all arbitrages ordered newest-first)
  search: publicProcedure
    .input(
      z.object({
        category: z.string(),
      }),
    )
    .query(async (_opts) => {
      return await prisma.arbitrage.findMany({
        orderBy: {
          detectionTime: "desc",
        },
      });
    }),

  // Get arbitrages joined with market resolution dates
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

      // use whichever market resolves later
      resolutionDate: new Date(
        Math.max(
          a.match.polymarketMarket.resolutionDate.getTime(),
          a.match.kalshiMarket.resolutionDate.getTime(),
        ),
      ),
    }));
  }),

  // Live subscription for newly added arbitrages
  onMarketAdd: publicProcedure
    .input(
      z.object({
        // last event received by client
        lastEventId: z.coerce.date().nullish(),
      }),
    )
    .subscription(async function* (opts) {
      let lastEventId = opts.input?.lastEventId ?? null;

      // stream updates until client disconnects
      while (!opts.signal!.aborted) {
        const arbitrages = await prisma.arbitrage.findMany({
          where: lastEventId
            ? {
                createdAt: {
                  // only send newer events
                  gt: lastEventId,
                },
              }
            : undefined,
          orderBy: {
            createdAt: "asc",
          },
        });

        // yield each new arbitrage event
        for (const arbitrage of arbitrages) {
          yield tracked(arbitrage.createdAt.toJSON(), arbitrage);
          lastEventId = arbitrage.createdAt;
        }

        // poll every second
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }),
});

export default arbitrageRouter;