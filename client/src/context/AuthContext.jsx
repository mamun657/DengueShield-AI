import { createContext, useContext, useMemo, useState } from "react";
import { resolveAvatarUrl } from "../utils/avatarUrl";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    let parsedUser = null;

    try {
      parsedUser = raw ? JSON.parse(raw) : null;
    } catch {
      parsedUser = null;
    }

    const normalizeRole = (role) => String(role || "").toLowerCase();
    const readRoleFromToken = () => {
      if (!token) return "";
      try {
        const payload = token.split(".")[1];
        if (!payload) return "";
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const data = JSON.parse(atob(padded));
        return data?.role || "";
      } catch {
        return "";
      }
    };

    if (!parsedUser) return null;

    const resolvedRole = normalizeRole(parsedUser.role || readRoleFromToken());
    const withRole = resolvedRole ? { ...parsedUser, role: resolvedRole } : parsedUser;
    return {
      ...withRole,
      photoUrl: resolveAvatarUrl(withRole.photoUrl),
    };
  });

  const login = ({ token, user: userData }) => {
    const normalizedUser = {
      ...userData,
      role: String(userData?.role || "").toLowerCase(),
      photoUrl: resolveAvatarUrl(userData?.photoUrl),
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updates) => {
    if (!updates) return;
    setUser((prev) => {
      const merged = { ...(prev || {}), ...updates };
      if (merged.role) merged.role = String(merged.role).toLowerCase();
      if ("photoUrl" in updates) {
        merged.photoUrl = resolveAvatarUrl(merged.photoUrl);
      }
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  };

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
