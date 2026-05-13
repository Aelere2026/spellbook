import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";
import { useNavigate } from "react-router-dom";

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [maxShares, setMaxShares] = useState(50);
  const [resolutionStart, setResolutionStart] = useState(new Date());
  const [resolutionEnd, setResolutionEnd] = useState(new Date());
  const [apiKey1, setApiKey1] = useState("");
  const [apiKey2, setApiKey2] = useState("");

  const updatePrefs = api.prefs.updatePreferences.useMutation();
  const { data: config } = api.prefs.getPreferences.useQuery();

  const signout = api.auth.signout.useMutation({
    onSuccess: () => navigate("/login"),
    onError: () => navigate("/login"),
  });

  const handleSignOut = () => {
    signout.mutate({ allSessions: false });
  };

  useEffect(() => {
    if (!config) return;
    setMaxShares(config.maxShares);
    setResolutionStart(config.resolutionStart);
    setResolutionEnd(config.resolutionEnd);
  }, [config]);

  const handleSaveMaxShares = async () => {
    await updatePrefs.mutateAsync({
      usePresetAlgorithm: true,
      manualShares: 5,
      maxShares,
      resolutionStart: resolutionStart,
      resolutionEnd: resolutionEnd,
    });
  };

  const handleSaveAPIKeys = async () => {
    setApiKey1("");
    setApiKey2("");

    await api.prefs.updateKeys.useMutation().mutateAsync({
      ...(apiKey1 !== ""
        ? {
            discord: {
              webhookURL: apiKey1,
            },
          }
        : {}),
      ...(apiKey1 !== "" && apiKey2 !== ""
        ? {
            twilio: {
              sid: apiKey1,
              authToken: apiKey2,
            },
          }
        : {}),
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

          {/* Account */}
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
            <h2 className="text-xl font-semibold">Account</h2>
            <p className="mt-1 text-sm opacity-70">Manage your session</p>
            <button
              onClick={handleSignOut}
              disabled={signout.isPending}
              className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                isDark
                  ? "border-rose-400/20 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-rose-300 shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                  : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-rose-500 shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-rose-700 hover:shadow-md"
              }`}
            >
              {signout.isPending ? "Signing out..." : "Sign Out"}
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
                    value={resolutionStart.toString()}
                    onChange={(e) =>
                      setResolutionStart(new Date(e.target.value))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-gray-600 bg-gray-800 text-white"
                        : "border-violet-300 bg-white"
                    }`}
                  />
                  <input
                    type="date"
                    value={resolutionEnd.toString()}
                    onChange={(e) => setResolutionEnd(new Date(e.target.value))}
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
                  min={0}
                  max={50}
                  step={1}
                  value={maxShares}
                  onChange={(e) => setMaxShares(Number(e.target.value))}
                  className={`w-40 rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-violet-300 bg-white"
                  }`}
                />
              </div>

              {/* Market Category */}
              <div className="flex flex-col gap-1">
                <label className="text-sm p-6 font-medium">
                  Choose a market category to purchase in
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

              {/* API Keys */}
              <div className="flex flex-col p-6 gap-1">
                <label className="text-sm font-medium">API Keys</label>
                <label className="text-xs mb-6 font-medium opacity-60">
                  For security reasons, saved keys cannot be retrieved after
                  saving.
                </label>
                <input
                  type="text"
                  placeholder="Key 1"
                  value={apiKey1}
                  onChange={(e) => setApiKey1(e.target.value)}
                  className={`w-40 rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-violet-300 bg-white"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Key 2"
                  value={apiKey2}
                  onChange={(e) => setApiKey2(e.target.value)}
                  className={`mt-2 w-40 rounded-xl border px-3 py-2 text-sm ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-violet-300 bg-white"
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-center p-6 mt-2 gap-4">
              <button
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium backdrop-blur-xl transition-all duration-200 ${
                  isDark
                    ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                    : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
                }`}
                onClick={handleSaveMaxShares}
              >
                Save
              </button>
              <button
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium backdrop-blur-xl transition-all duration-200 ${
                  isDark
                    ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                    : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
                }`}
                onClick={handleSaveAPIKeys}
              >
                Save API Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;