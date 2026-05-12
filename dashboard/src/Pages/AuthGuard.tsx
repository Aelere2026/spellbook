import React from "react";
import { Navigate } from "react-router-dom";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";
 
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
 
  // isAdmin is a userProcedure — throws UNAUTHORIZED if not logged in
  const { isLoading, isError } = api.auth.isAdmin.useQuery(undefined, {
    retry: false,
  });
 
  if (isLoading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDark ? "bg-[#0b0915] text-violet-200" : "bg-[#f5f0ff] text-violet-700"
        }`}
      >
        Loading...
      </div>
    );
  }
 
  if (isError) {
    return <Navigate to="/login" replace />;
  }
 
  return <>{children}</>;
};
 
export default AuthGuard;