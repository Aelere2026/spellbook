import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcPresetShares,
  detectArbitrage,
  kalshiTakerFee,
  MIN_NET_PROFIT,
  polymarketTakerFee,
} from "../src/arbitrage/detection";

describe("arbitrage detection", () => {
  it("calculates probability-weighted platform fees", () => {
    assert.equal(kalshiTakerFee(0.5), 0.0175);
    assert.equal(polymarketTakerFee(0.5, 0.04), 0.01);
    assert.equal(kalshiTakerFee(0), 0);
    assert.equal(polymarketTakerFee(1, 0.04), 0);
  });

  it("sizes preset shares from gross edge with min and max bounds", () => {
    assert.equal(calcPresetShares(0, 50), 1);
    assert.equal(calcPresetShares(0.02, 50), 20);
    assert.equal(calcPresetShares(0.035, 50), 30);
    assert.equal(calcPresetShares(0.09, 50), 50);
  });

  it("returns the most profitable arbitrage leg after fees and slippage", () => {
    const result = detectArbitrage(
      42,
      { yes: 0.61, no: 0.44 },
      { yes: 0.52, no: 0.28 },
      30,
      0.04,
    );

    assert.ok(result);
    assert.equal(result.matchId, 42);
    assert.equal(result.polymarketYes, true);
    assert.equal(result.yesPrice, 0.61);
    assert.equal(result.noPrice, 0.28);
    assert.equal(result.shares, 30);
    assert.equal(result.grossProfit, 0.10999999999999999);
    assert.ok(result.netProfit > MIN_NET_PROFIT);
  });

  it("can detect the inverse leg when Kalshi YES plus Polymarket NO is better", () => {
    const result = detectArbitrage(
      7,
      { yes: 0.54, no: 0.31 },
      { yes: 0.46, no: 0.51 },
      10,
      0.04,
    );

    assert.ok(result);
    assert.equal(result.polymarketYes, false);
    assert.equal(result.yesPrice, 0.46);
    assert.equal(result.noPrice, 0.31);
  });

  it("rejects candidates that do not clear net profit threshold", () => {
    const result = detectArbitrage(
      99,
      { yes: 0.51, no: 0.51 },
      { yes: 0.5, no: 0.5 },
      1,
      0.04,
    );

    assert.equal(result, null);
  });
});
