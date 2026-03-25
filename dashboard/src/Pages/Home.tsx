import React from "react";

const Home: React.FC = () => {
  return (
    <div className="relative min-h-screen text-violet-50">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 px-8 py-14 shadow-[0_25px_80px_rgba(15,8,35,0.55)] backdrop-blur-xl sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_25%)]" />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-6 flex items-center justify-center">
              <img
                src="/favicon.ico"
                alt="SPeLLbook logo"
                className="h-28 w-28 rounded-[2rem] shadow-[0_20px_60px_rgba(91,33,182,0.35)] sm:h-36 sm:w-36"
              />
            </div>

            <div className="inline-flex items-center rounded-full border border-violet-400/15 bg-violet-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] text-violet-200/80">
              Cross-Market Arbitrage
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              SPeLLbook
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-violet-200/75 sm:text-lg">
              SPeLLbook helps identify{" "}
              <span className="text-white font-medium">
                sum-to-one arbitrage
              </span>{" "}
              between Polymarket and Kalshi. In these situations, the combined
              prices of complementary outcomes across markets add up to less
              than one dollar, creating a potential opportunity to lock in
              profit before fees and slippage. This dashboard helps track
              matches, opportunities, and performance in one place.
            </p>

            <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-6 py-5 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  What it Finds
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Pricing mismatches
                </div>
                <p className="mt-2 text-sm leading-6 text-violet-200/65">
                  Detects when complementary contracts across Polymarket and
                  Kalshi may be underpriced in combination.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-6 py-5 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Why it Matters
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Potential arbitrage edge
                </div>
                <p className="mt-2 text-sm leading-6 text-violet-200/65">
                  A sum below one can imply a theoretical profit opportunity
                  once the paired positions are placed.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-6 py-5 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  What SPeLLbook Shows
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Matches, trades, and stats
                </div>
                <p className="mt-2 text-sm leading-6 text-violet-200/65">
                  Brings together discovered opportunities, trade history, and
                  performance analytics in one interface.
                </p>
              </div>
            </div>

            <div className="mt-12 w-full max-w-3xl rounded-3xl border border-violet-400/12 bg-white/5 px-8 py-6 backdrop-blur-md">
              <div className="text-[11px] uppercase tracking-[0.24em] text-violet-200/55">
                Creators
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
                {["Sophie", "Pedro", "Leah", "Lasha"].map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-violet-400/12 bg-violet-500/10 px-4 py-2 text-violet-100"
                  >
                    {name === "Pedro" ? (
                      <>
                        <span className="font-semibold text-white">
                          {name.slice(0, 2)}
                        </span>
                        {name.slice(2)}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-white">
                          {name.charAt(0)}
                        </span>
                        {name.slice(1)}
                      </>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
