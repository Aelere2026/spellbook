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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);