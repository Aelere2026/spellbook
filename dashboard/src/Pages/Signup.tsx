import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

const Signup: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [inviteName, setInviteName] = useState<string | null>(null);

  // Check invite token validity
  const { data: inviteCheck } = api.auth.checkInvite.useQuery(
    { token },
    { enabled: token.length > 0 }
  );

  useEffect(() => {
    setInviteName(inviteCheck ?? null);
  }, [inviteCheck]);

  const signup = api.auth.signup.useMutation({
    onSuccess: () => navigate("/"),
    onError: () => setError("Signup failed. Your invite token may be invalid or expired."),
  });

  const handleSubmit = () => {
    setError("");
    if (!token) { setError("Please enter your invite token."); return; }
    if (!password) { setError("Please enter a password."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    signup.mutate({ token, password });
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
            Create your account
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
            Create account
          </h1>

          <div className="flex flex-col gap-4">
            <div>
            <label className={`mb-1.5 block text-xs uppercase tracking-[0.15em] ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Invite Token <span className="normal-case tracking-normal opacity-60">(your username is set by your invite)</span>
              </label>
              <input
                type="text"
                placeholder="Enter your invite token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={inputClass}
              />
              {inviteName && (
                <p className={`mt-1.5 text-xs ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>
                  ✓ Valid invite for <span className="font-semibold">{inviteName}</span>
                </p>
              )}
              {token.length > 0 && !inviteName && (
                <p className={`mt-1.5 text-xs ${isDark ? "text-rose-300" : "text-rose-600"}`}>
                  Invalid or expired invite token
                </p>
              )}
            </div>

            <div>
              <label className={`mb-1.5 block text-xs uppercase tracking-[0.15em] ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Password
              </label>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={`mb-1.5 block text-xs uppercase tracking-[0.15em] ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={signup.isPending || !inviteName}
              className={[
                "mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                "hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
                isDark
                  ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-violet-100 shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:border-violet-300/35 hover:text-white"
                  : "border-violet-300 bg-violet-600 text-white hover:bg-violet-700",
              ].join(" ")}
            >
              {signup.isPending ? "Creating account..." : "Create account"}
            </button>
          </div>

          <div className={`mt-6 text-center text-sm ${isDark ? "text-violet-200/50" : "text-violet-500"}`}>
            Already have an account?{" "}
            <Link
              to="/login"
              className={`font-medium hover:underline ${isDark ? "text-violet-300 hover:text-violet-100" : "text-violet-600 hover:text-violet-900"}`}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;