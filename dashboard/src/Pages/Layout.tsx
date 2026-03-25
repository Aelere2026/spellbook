import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useTheme } from "../context/ThemeContext";

const Layout: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={isDark
      ? "min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(135,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#0b0915_0%,_#120d22_50%,_#09070f_100%)] text-violet-50"
      : "min-h-screen w-full bg-gradient-to-br from-[#f8f4ff] via-[#f3eeff] to-[#ede8ff] text-gray-900"
    }>
      {isDark && (
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(136,84,255,0.14),transparent_22%),radial-gradient(circle_at_80%_0%,rgba(178,96,255,0.1),transparent_20%)]" />
      )}
      
      <div className="relative">
        <Navbar />
        <main className="mx-auto w-full px-6 py-6 sm:px-8 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;