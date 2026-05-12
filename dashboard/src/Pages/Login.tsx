import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

const Login: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = api.auth.login.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: () => {
      setError("Invalid username or password.");
    },
  });

  const handleSubmit = () => {
    setError("");
    if (!name || !password) {
      setError("Please enter your username and password.");
      return;
    }
    login.mutate({ name, password });
  };

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
    isDark
      ? "border-violet-400/20 bg-gray-900 text-white placeholder-violet-300/40 focus:border-violet-400/60"
      : "border-violet-300 bg-white text-violet-900 placeholder-violet-300 focus:border-violet-500"
  }`;

  return (
    <div
      style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
      className={`flex min-h-screen items-center justify-center px-4 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,rgba(135,58,237,0.18),transparent_28%),linear-gradient(180deg,#0b0915_0%,#120d22_50%,#09070f_100%)]"
          : ""
      }`}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className={`text-3xl font-semibold tracking-wide ${isDark ? "text-white" : "text-violet-900"}`}>
            SPeLLbook
          </div>
          <p className={`mt-2 text-sm ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
            Cross-market arbitrage detection
          </p>
        </div>

        {/* Card */}
        <div
          style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
          className={[
            "rounded-3xl border px-8 py-10 backdrop-blur-xl",
            isDark
              ? "border-violet-400/15 bg-gradient-to-br from-[#1a1230] via-[#25183f] to-[#110c1f] shadow-[0_22px_70px_rgba(20,10,50,0.45)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <h1 className={`mb-6 text-xl font-semibold ${isDark ? "text-white" : "text-violet-900"}`}>
            Sign in
          </h1>

          <div className="flex flex-col gap-4">
            <div>
              <label className={`mb-1.5 block text-xs uppercase tracking-[0.15em] ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={inputClass}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-xs uppercase tracking-[0.15em] ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={inputClass}
              />
            </div>

            {error && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                isDark
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                  : "border-rose-300 bg-rose-50 text-rose-600"
              }`}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={login.isPending}
              className={[
                "mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                "hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
                isDark
                  ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-violet-100 shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:border-violet-300/35 hover:text-white"
                  : "border-violet-300 bg-violet-600 text-white hover:bg-violet-700",
              ].join(" ")}
            >
              {login.isPending ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className={`mt-6 text-center text-sm ${isDark ? "text-violet-200/50" : "text-violet-500"}`}>
            Have an invite token?{" "}
            <Link
              to="/signup"
              className={`font-medium hover:underline ${isDark ? "text-violet-300 hover:text-violet-100" : "text-violet-600 hover:text-violet-900"}`}
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;