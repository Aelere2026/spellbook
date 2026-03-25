import React from "react";
import { useTheme } from "../context/ThemeContext";

const Home: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`relative min-h-screen ${isDark ? "text-violet-50" : "text-gray-900"}`}>
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
        <section
          style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
          className={[
            "relative overflow-hidden rounded-[2rem] border px-8 py-14 backdrop-blur-xl sm:px-12 sm:py-20",
            isDark
              ? "border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 shadow-[0_25px_80px_rgba(15,8,35,0.55)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          {isDark && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_25%)]" />
          )}

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-6 flex items-center justify-center">
              <img
                src="/favicon.ico"
                alt="SPeLLbook logo"
                className="h-28 w-28 rounded-[2rem] shadow-[0_20px_60px_rgba(91,33,182,0.35)] sm:h-36 sm:w-36"
              />
            </div>

            <div className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] ${isDark ? "border-violet-400/15 bg-violet-500/10 text-violet-200/80" : "border-violet-300 bg-violet-50 text-violet-600"}`}>
              Cross-Market Arbitrage
            </div>

            <h1 className={`mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl ${isDark ? "text-white" : "text-gray-900"}`}>
              SPeLLbook
            </h1>

            <p className={`mt-5 max-w-3xl text-base leading-8 sm:text-lg ${isDark ? "text-violet-200/75" : "text-gray-500"}`}>
              SPeLLbook helps identify{" "}
              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                sum-to-one arbitrage
              </span>{" "}
              between Polymarket and Kalshi. In these situations, the combined
              prices of complementary outcomes across markets add up to less
              than one dollar, creating a potential opportunity to lock in
              profit before fees and slippage. This dashboard helps track
              matches, opportunities, and performance in one place.
            </p>

            <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "What it Finds",
                  title: "Pricing mismatches",
                  body: "Detects when complementary contracts across Polymarket and Kalshi may be underpriced in combination.",
                },
                {
                  label: "Why it Matters",
                  title: "Potential arbitrage edge",
                  body: "A sum below one can imply a theoretical profit opportunity once the paired positions are placed.",
                },
                {
                  label: "What SPeLLbook Shows",
                  title: "Matches, trades, and stats",
                  body: "Brings together discovered opportunities, trade history, and performance analytics in one interface.",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
                  className={`rounded-2xl border px-6 py-5 backdrop-blur-md ${isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200 shadow-sm"}`}
                >
                  <div className={`text-[11px] uppercase tracking-[0.2em] ${isDark ? "text-violet-200/55" : "text-gray-400"}`}>
                    {card.label}
                  </div>
                  <div className={`mt-2 text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {card.title}
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${isDark ? "text-violet-200/65" : "text-gray-500"}`}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
              className={`mt-12 w-full max-w-3xl rounded-3xl border px-8 py-6 backdrop-blur-md ${isDark ? "border-violet-400/12 bg-white/5" : "border-violet-200 shadow-sm"}`}
            >
              <div className={`text-[11px] uppercase tracking-[0.24em] ${isDark ? "text-violet-200/55" : "text-gray-400"}`}>
                Creators
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
                {["Sophie", "Pedro", "Leah", "Lasha"].map((name) => (
                  <span
                    key={name}
                    className={`rounded-full border px-4 py-2 ${isDark ? "border-violet-400/12 bg-violet-500/10 text-violet-100" : "border-violet-200 bg-violet-50 text-violet-700"}`}
                  >
                    {name === "Pedro" ? (
                      <>
                        <span className={`font-semibold ${isDark ? "text-white" : "text-violet-900"}`}>
                          {name.slice(0, 2)}
                        </span>
                        {name.slice(2)}
                      </>
                    ) : (
                      <>
                        <span className={`font-semibold ${isDark ? "text-white" : "text-violet-900"}`}>
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
