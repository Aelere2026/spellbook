import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const linkBase = "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200";
  const linkInactive = isDark
    ? "text-violet-200/75 hover:bg-white/5 hover:text-white"
    : "text-violet-600 hover:bg-violet-100 hover:text-violet-900";
  const linkActive = isDark
    ? "bg-violet-500/15 text-white ring-1 ring-violet-300/20"
    : "bg-violet-200/60 text-violet-900 ring-1 ring-violet-300/50";

  return (
    <header className={isDark
      ? "sticky top-0 z-50 border-b border-violet-300/10 bg-[#0b0915]/80 backdrop-blur-xl"
      : "sticky top-0 z-50 border-b border-violet-200 bg-[#f5f0ff]/80 backdrop-blur-xl"
    }>
      <div className="mx-auto flex w-full items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link
          to="/home"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <img
            src="/favicon.ico"
            alt="SPeLLbook"
            className="h-10 w-10 rounded-xl"
          />
          <div className={`text-xl font-semibold tracking-wide ${isDark ? "text-white" : "text-violet-900"}`}>
            SPeLLbook
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/home" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Home
          </NavLink>
          <NavLink to="/" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Dashboard
          </NavLink>
          <NavLink to="/gain-loss" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Gain / Loss
          </NavLink>
          <NavLink to="/somewhere" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Something
          </NavLink>
          <NavLink to="/somewher" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Something
          </NavLink>
          <button
            onClick={toggleTheme}
            className={`ml-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
              isDark
                ? "text-violet-200/75 hover:bg-white/5 hover:text-white"
                : "text-violet-600 hover:bg-violet-100 hover:text-violet-900"
            }`}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;