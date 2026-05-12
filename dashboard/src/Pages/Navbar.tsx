import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const signout = api.auth.signout.useMutation({
    onSuccess: () => navigate("/login"),
    onError: () => navigate("/login"),
  });

  const handleSignOut = () => {
    signout.mutate({ allSessions: false });
  };

  const linkBase =
    "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200";
  const linkInactive = isDark
    ? "text-violet-200/75 hover:bg-white/5 hover:text-white"
    : "text-violet-600 hover:bg-violet-100 hover:text-violet-900";
  const linkActive = isDark
    ? "bg-violet-500/15 text-white ring-1 ring-violet-300/20"
    : "bg-violet-200/60 text-violet-900 ring-1 ring-violet-300/50";

  const metricLinks = [
    { to: "/gain-loss", label: "Gain/Loss" },
    { to: "/opportunities", label: "Opportunities" },
    { to: "/fees", label: "Total Fee Loss" },
    { to: "/avgROI", label: "Avg ROI" },
  ];

  const isAnalyticsActive = useMemo(
    () => metricLinks.some((item) => location.pathname === item.to),
    [location.pathname],
  );

  const analyticsButtonClass = isDark
    ? [
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium",
        "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]",
        "text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] backdrop-blur-xl",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/35",
        "hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]",
        isAnalyticsActive || analyticsOpen
          ? "ring-1 ring-violet-300/25 border-violet-300/30 text-[#646cff]"
          : "",
      ].join(" ")
    : [
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium",
        "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff]",
        "text-[#646cff] shadow-sm backdrop-blur-xl",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300",
        "hover:text-violet-900 hover:shadow-md",
        isAnalyticsActive || analyticsOpen
          ? "ring-1 ring-violet-300/50 border-violet-300 text-[#646cff]"
          : "",
      ].join(" ");

  return (
    <header
      className={
        isDark
          ? "sticky top-0 z-50 border-b border-violet-300/10 bg-[#0b0915]/80 backdrop-blur-xl"
          : "sticky top-0 z-50 border-b border-violet-200 bg-[#f5f0ff]/80 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex w-full items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link
          to="/home"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <img
            src="/favicon.ico"
            alt="SPeLLbook"
            className="h-12 w-12 rounded-xl"
          />
          <div
            className={`text-2xl font-semibold tracking-wide ${
              isDark ? "text-white" : "text-violet-900"
            }`}
          >
            SPeLLbook
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/profit"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Profit
          </NavLink>

          <div
            className="relative inline-block"
            onMouseEnter={() => setAnalyticsOpen(true)}
            onMouseLeave={() => setAnalyticsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setAnalyticsOpen((prev) => !prev)}
              className={analyticsButtonClass}
            >
              <span>Analytics</span>
              <span
                className={`text-[10px] transition-transform duration-200 ${
                  analyticsOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {analyticsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[240px] pt-2">
                <div
                  className={[
                    "absolute right-0 top-full mt-0 z-50 min-w-[240px]",
                    "rounded-2xl border p-2 shadow-2xl backdrop-blur-xl ",
                    isDark
                      ? "border-violet-400/10 bg-[#120d22]/95"
                      : "border-violet-200 bg-white/95",
                  ].join(" ")}
                >
                  <div className="grid gap-1">
                    {metricLinks.map((item) => {
                      const active = location.pathname === item.to;

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={[
                            "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                            active
                              ? isDark
                                ? "bg-violet-500/15 text-[#646cff] ring-1 ring-violet-300/20"
                                : "bg-violet-200/60 text-[#646cff] ring-1 ring-violet-300/50"
                              : isDark
                                ? "text-violet-200/75 hover:bg-white/5 hover:text-white"
                                : "text-violet-600 hover:bg-violet-100 hover:text-violet-900",
                          ].join(" ")}
                          onClick={() => setAnalyticsOpen(false)}
                        >
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className={`ml-2 inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium backdrop-blur-xl transition-all duration-200 ${
              isDark
                ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
            }`}
          >
            <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            className={`ml-2 inline-flex items-center justify-center text-lg transition-all duration-200 ${
              isDark
                ? "text-violet-300 hover:text-white hover:scale-110"
                : "text-violet-500 hover:text-violet-900 hover:scale-110"
            }`}
            title="Settings"
          >
            ⚙️
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;