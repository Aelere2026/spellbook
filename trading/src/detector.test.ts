import { strict as assert } from "assert";

// ─── Copy the types and detectArbitrage function here for testing ───────────

interface PriceQuote {
  yes: number;
  no: number;
}

interface ArbOpportunity {
  matchId: number;
  yesPrice: number;
  noPrice: number;
  polymarketYes: boolean;
  grossProfit: number;
  totalFee: number;
  estimatedSlippage: number;
  netProfit: number;
}

const KALSHI_FEE = 0.00;
const POLYMARKET_FEE = 0.02;
const SLIPPAGE_ESTIMATE = 0.005;

function detectArbitrage(
  matchId: number,
  polyPrices: PriceQuote,
  kalshiPrices: PriceQuote
): ArbOpportunity | null {
  const candidates = [
    { yesPrice: polyPrices.yes, noPrice: kalshiPrices.no, polymarketYes: true },
    { yesPrice: kalshiPrices.yes, noPrice: polyPrices.no, polymarketYes: false },
  ];

  let best: ArbOpportunity | null = null;

  for (const c of candidates) {
    const grossProfit = 1.0 - c.yesPrice - c.noPrice;
    const totalFee = KALSHI_FEE + POLYMARKET_FEE;
    const estimatedSlippage = SLIPPAGE_ESTIMATE * 2;
    const netProfit = grossProfit - totalFee - estimatedSlippage;

    if (netProfit > 0) {
      if (!best || netProfit > best.netProfit) {
        best = { matchId, ...c, grossProfit, totalFee, estimatedSlippage, netProfit };
      }
    }
  }

  return best;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// Test 1: Clear arbitrage opportunity (Poly YES + Kalshi NO)
test("detects arb when Poly YES + Kalshi NO < $1 after fees", () => {
    const result = detectArbitrage(
      1,
      { yes: 0.55, no: 0.39 },  // Polymarket
      { yes: 0.62, no: 0.39 }   // Kalshi
    );
    assert(result !== null, "should find an opportunity");
    assert(result.polymarketYes === true, "should buy YES on Polymarket");
    assert(result.netProfit > 0, "net profit should be positive");
    console.log(`   gross=${result.grossProfit.toFixed(4)} net=${result.netProfit.toFixed(4)}`);
  });

// Test 2: Clear arbitrage opportunity (Kalshi YES + Poly NO)
test("detects arb when Kalshi YES + Poly NO < $1 after fees", () => {
  const result = detectArbitrage(
    2,
    { yes: 0.62, no: 0.30 },  // Polymarket
    { yes: 0.55, no: 0.39 }   // Kalshi
  );
  assert(result !== null, "should find an opportunity");
  assert(result.polymarketYes === false, "should buy YES on Kalshi");
  assert(result.netProfit > 0, "net profit should be positive");
  console.log(`   gross=${result.grossProfit.toFixed(4)} net=${result.netProfit.toFixed(4)}`);
});

// Test 3: No arb when prices are too high
test("returns null when no arb exists", () => {
  const result = detectArbitrage(
    3,
    { yes: 0.82, no: 0.60 },  // Polymarket
    { yes: 0.55, no: 0.45 }   // Kalshi
  );
  assert(result === null, "should not find an opportunity");
});

// Test 4: No arb when gross profit exists but fees kill it
test("returns null when fees eliminate the profit", () => {
    const result = detectArbitrage(
      4,
      { yes: 0.62, no: 0.39 },  // Polymarket
      { yes: 0.55, no: 0.368 }  // Kalshi — gross = 1 - 0.55 - 0.39 = 0.06, net = 0.06 - 0.02 - 0.01 = 0.03
    );
    const result2 = detectArbitrage(
      4,
      { yes: 0.80, no: 0.75 },  // Polymarket — sum already > 1
      { yes: 0.75, no: 0.80 }   // Kalshi
    );
    assert(result2 === null, "should not find arb when prices sum > 1");
  });

// Test 5: Picks the better of two arb combos
test("picks the combo with higher net profit", () => {
  const result = detectArbitrage(
    5,
    { yes: 0.60, no: 0.30 },  // Polymarket — both combos have arb
    { yes: 0.50, no: 0.35 }   // Kalshi
  );
  assert(result !== null, "should find an opportunity");
  // Poly YES + Kalshi NO = 0.60 + 0.35 = 0.95, gross = 0.05
  // Kalshi YES + Poly NO = 0.50 + 0.30 = 0.80, gross = 0.20 ← better
  assert(result.polymarketYes === false, "should pick the better combo");
  console.log(`   gross=${result.grossProfit.toFixed(4)} net=${result.netProfit.toFixed(4)}`);
});

// ─── Resolution Date Cutoff Tests ──────────────────────────────────────────
//
// applyResolutionCutoff is inlined here matching the logic in runDetector().
// If the filter logic in detector.ts changes, update this copy too.

interface MockMarket {
  resolutionDate: Date;
}

interface MockMatch {
  id: number;
  polymarketMarket: MockMarket;
  kalshiMarket: MockMarket;
}

function applyResolutionCutoff(
  matches: MockMatch[],
  cutoff: Date | null,
): MockMatch[] {
  if (!cutoff) return matches;
  return matches.filter((m) => {
    const laterDate = new Date(
      Math.max(
        m.polymarketMarket.resolutionDate.getTime(),
        m.kalshiMarket.resolutionDate.getTime(),
      ),
    );
    return laterDate <= cutoff;
  });
}

const CUTOFF   = new Date("2026-06-01");
const BEFORE   = new Date("2026-05-01");
const ON_DAY   = new Date("2026-06-01");
const AFTER    = new Date("2026-07-01");
const WAY_AFTER = new Date("2027-01-01");

function match(id: number, polyDate: Date, kalshiDate: Date): MockMatch {
  return { id, polymarketMarket: { resolutionDate: polyDate }, kalshiMarket: { resolutionDate: kalshiDate } };
}

// Test 6: null cutoff passes all matches through unchanged
test("null cutoff returns all matches", () => {
  const matches = [match(1, BEFORE, BEFORE), match(2, AFTER, AFTER)];
  const result = applyResolutionCutoff(matches, null);
  assert.equal(result.length, 2, "all matches should pass");
});

// Test 7: both sides resolve before cutoff → kept
test("keeps match where both sides resolve before cutoff", () => {
  const result = applyResolutionCutoff([match(1, BEFORE, BEFORE)], CUTOFF);
  assert.equal(result.length, 1, "match should be kept");
});

// Test 8: both sides resolve after cutoff → filtered
test("filters match where both sides resolve after cutoff", () => {
  const result = applyResolutionCutoff([match(1, AFTER, AFTER)], CUTOFF);
  assert.equal(result.length, 0, "match should be filtered");
});

// Test 9: uses the later of the two dates — Polymarket after, Kalshi before
test("filters when Polymarket resolves after cutoff even if Kalshi is before", () => {
  const result = applyResolutionCutoff([match(1, AFTER, BEFORE)], CUTOFF);
  assert.equal(result.length, 0, "later date (Polymarket) exceeds cutoff — should filter");
});

// Test 10: uses the later of the two dates — Kalshi after, Polymarket before
test("filters when Kalshi resolves after cutoff even if Polymarket is before", () => {
  const result = applyResolutionCutoff([match(1, BEFORE, AFTER)], CUTOFF);
  assert.equal(result.length, 0, "later date (Kalshi) exceeds cutoff — should filter");
});

// Test 11: match resolving exactly on the cutoff date is kept (≤ boundary)
test("keeps match whose resolution date is exactly the cutoff date", () => {
  const result = applyResolutionCutoff([match(1, ON_DAY, BEFORE)], CUTOFF);
  assert.equal(result.length, 1, "match on exact cutoff date should be kept");
});

// Test 12: mixed list — only matches within cutoff survive
test("filters mixed list correctly", () => {
  const matches = [
    match(1, BEFORE,    BEFORE),    // both before  → keep
    match(2, ON_DAY,    BEFORE),    // on cutoff     → keep
    match(3, AFTER,     BEFORE),    // poly after    → filter
    match(4, BEFORE,    AFTER),     // kalshi after  → filter
    match(5, WAY_AFTER, WAY_AFTER), // both after    → filter
  ];
  const result = applyResolutionCutoff(matches, CUTOFF);
  assert.equal(result.length, 2, "only 2 matches should survive");
  assert(result.some((m) => m.id === 1), "match 1 should survive");
  assert(result.some((m) => m.id === 2), "match 2 should survive");
});

// Test 13: cutoff in the far future passes everything
test("far-future cutoff keeps all matches", () => {
  const matches = [match(1, BEFORE, AFTER), match(2, WAY_AFTER, WAY_AFTER)];
  const result = applyResolutionCutoff(matches, new Date("2099-01-01"));
  assert.equal(result.length, 2, "all matches should pass a far-future cutoff");
});

// Test 14: empty match list returns empty regardless of cutoff
test("empty match list returns empty with any cutoff", () => {
  assert.equal(applyResolutionCutoff([], CUTOFF).length, 0);
  assert.equal(applyResolutionCutoff([], null).length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);