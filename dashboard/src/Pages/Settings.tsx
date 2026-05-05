import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [maxShares, setMaxShares] = useState(50);
  const [resolutionStart, setResolutionStart] = useState("");
  const [resolutionEnd, setResolutionEnd] = useState("");
  const updateConfig = api.config.update.useMutation();
  const { data: config } = api.config.get.useQuery();

  useEffect(() => {
    if (!config) return;
    setMaxShares(config.maxShares);
    setResolutionStart(config.resolutionStart ? new Date(config.resolutionStart).toISOString().slice(0, 10) : "");
    setResolutionEnd(config.resolutionEnd ? new Date(config.resolutionEnd).toISOString().slice(0, 10) : "");
  }, [config]);

  const handleSaveMaxShares = async () => {
    await updateConfig.mutateAsync({
      usePresetAlgo: true,
      maxShares: Number(maxShares),
      resolutionStart: resolutionStart ? new Date(resolutionStart).toISOString() : null,
      resolutionEnd: resolutionEnd ? new Date(resolutionEnd).toISOString() : null,
    });
  };

  return (
    <div
      className={`relative min-h-screen ${
        isDark ? "text-violet-50" : "text-gray-900"
      }`}
    >
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
        {/* Header */}
        <section
          style={
            !isDark
              ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
              : undefined
          }
          className={[
            "rounded-[2rem] border px-8 py-10 backdrop-blur-xl",
            isDark
              ? "border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 shadow-[0_25px_80px_rgba(15,8,35,0.55)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <h1
            className={`text-4xl font-semibold tracking-tight ${
              isDark ? "text-white" : "text-violet-900"
            }`}
          >
            Settings
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? "text-violet-200/60" : "text-violet-500"
            }`}
          >
            Customize your preferences :)
          </p>
        </section>

        <div className="mt-8 grid gap-6">
          {/* Appearance */}
          <div
            style={
              !isDark
                ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" }
                : undefined
            }
            className={`rounded-2xl border p-6 backdrop-blur-md ${
              isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"
            }`}
          >
            <h2 className="text-xl font-semibold">Appearance</h2>
            <p className="mt-1 text-sm opacity-70">
              Switch between light and dark mode
            </p>

            <button
              onClick={toggleTheme}
              className={`ml-2 mt-6 inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium backdrop-blur-xl transition-all duration-200 ${
                isDark
                  ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                  : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
              }`}
            >
              <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>

          {/* Notifications */}
          <div
            style={
              !isDark
                ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" }
                : undefined
            }
            className={`rounded-2xl border p-6 backdrop-blur-md ${
              isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"
            }`}
          >
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="mt-1 text-sm opacity-70">Enable notifications</p>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4" defaultChecked />
                <span className="text-sm">Enable text messaging</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4" defaultChecked />
                <span className="text-sm">Enable email</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4" defaultChecked />
                <span className="text-sm">Enable discord messaging</span>
              </label>
            </div>
          </div>

          {/* Trade Settings */}
          <div
            style={
              !isDark
                ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" }
                : undefined
            }
            className={`rounded-2xl border p-6 backdrop-blur-md ${
              isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"
            }`}
          >
            <h2 className="text-xl font-semibold">Trade Settings</h2>
            <p className="mt-1 text-sm opacity-70">
              Manage your bot trading behavior
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {/* Resolution Date */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Choose a range of time for your market resolution dates
                </label>

                <div className="flex gap-3">
                  <input
                    type="date"
                    value={resolutionStart}
                    onChange={(e) => setResolutionStart(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-gray-600 bg-gray-800 text-white"
                        : "border-violet-300 bg-white"
                    }`}
                  />
                  <input
                    type="date"
                    value={resolutionEnd}
                    onChange={(e) => setResolutionEnd(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-gray-600 bg-gray-800 text-white"
                        : "border-violet-300 bg-white"
                    }`}
                  />
                </div>

                <div className="flex justify-between text-xs opacity-60">
                  <span>Start Date</span>
                  <span>End Date</span>
                </div>
              </div>

              {/* Trading by Volume */}
              <div className="flex flex-col p-6 gap-1">
                <label className="text-sm font-medium">
                  Choose a maximum volume to purchase shares in
                </label>
                <label className="text-xs mb-6 font-medium">
                  The system automatically adjusts trade size based on
                  opportunity strength, but will never exceed this limit.
                </label>

                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={maxShares}
                  onChange={(e) => setMaxShares(Number(e.target.value))}
                  defaultValue={maxShares}
                  className={`w-40 rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-violet-300 bg-white"
                  }`}
                />
              </div>
              {/* Market Category */}
              <div className="flex flex-col  gap-1">
                <label className="text-sm p-6 font-medium">
                  Choose a market category to purchase in{" "}
                </label>
                <select
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-violet-300 bg-white"
                  }`}
                >
                  <option>Sports</option>
                  <option>Crypto</option>
                  <option>Politics</option>
                  <option>Entertainment</option>
                  <option>Any</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center p-6 mt-2">
              <button
                className={`inline-flex items-center gap-2 rounded-xl border p-6 px-2 py-1 text-xs font-medium backdrop-blur-xl transition-all duration-200 ${
                  isDark
                    ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                    : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
                }`}
                onClick={handleSaveMaxShares}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
