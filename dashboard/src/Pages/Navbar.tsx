import React from "react";
import { Link, NavLink } from "react-router-dom";

const linkBase =
  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200";
const linkInactive = "text-violet-200/75 hover:bg-white/5 hover:text-white";
const linkActive = "bg-violet-500/15 text-white ring-1 ring-violet-300/20";

const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-violet-300/10 bg-[#0b0915]/80 backdrop-blur-xl">
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
          <div className="text-xl font-semibold tracking-wide text-white">
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
            to="/gain-loss"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Gain / Loss
          </NavLink>

          <NavLink
            to="/somewhere"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Something
          </NavLink>

          <NavLink
            to="/somewher"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Something
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
