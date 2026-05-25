import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarUrl } from "../utils/avatarUrl";

const DashboardNavbar = ({ userName, userRole, userPhotoUrl, onLogout, onOpenSmartDoctor }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const resolvedName = userName || user?.name;
  const resolvedRole = userRole || user?.role;
  const resolvedPhotoUrl = resolveAvatarUrl(userPhotoUrl || user?.photoUrl);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [resolvedPhotoUrl]);
  const isAdmin = String(resolvedRole || "").toLowerCase() === "admin";
  const initials = (resolvedName || "U").trim().charAt(0).toUpperCase();

  console.log("Current route:", location.pathname);

  return (
    <nav className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 overflow-x-auto border-b border-white/10 bg-[#0f172a] px-6">
      <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 transition-transform hover:scale-[1.02]">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 p-1.5 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
          <img src="/dengue-icon.png" alt="DengueShield AI Logo" className="h-full w-full object-contain [filter:invert(85%)_sepia(45%)_saturate(448%)_hue-rotate(130deg)_brightness(102%)_contrast(106%)] drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
        </div>
        <div className="text-lg font-bold tracking-wide text-white">DengueShield AI</div>
      </Link>
      <div className="flex min-w-max items-center gap-2 text-sm text-gray-300">
        <NavLink 
          to="/dashboard" 
          end
          className={({ isActive }) => 
            `group flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-300 ${
              isActive 
                ? "bg-[#1e293b]/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <img 
                src="/dashboard-icon.png" 
                alt="Dashboard" 
                className={`h-4 w-4 object-contain transition-all duration-300 ${
                  isActive 
                    ? "[filter:invert(85%)_sepia(45%)_saturate(448%)_hue-rotate(130deg)_brightness(102%)_contrast(106%)] opacity-100 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" 
                    : "[filter:invert(1)] opacity-50 group-hover:opacity-80"
                }`} 
              />
              <span className={isActive ? "font-medium" : "font-normal"}>{t("dashboard")}</span>
            </>
          )}
        </NavLink>

        {isAdmin && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => 
              `rounded-lg px-4 py-2 transition-all duration-300 ${
                isActive 
                  ? "bg-[#1e293b]/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30 font-medium" 
                  : "text-slate-400 font-normal hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {t("admin")}
          </NavLink>
        )}

        <button
          className="rounded-lg px-4 py-2 font-normal text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
          onClick={onOpenSmartDoctor}
          type="button"
        >
          🩺 Smart Doctor
        </button>

        <NavLink
          to="/graphrag"
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 transition-all duration-300 ${
              isActive
                ? "bg-[#1e293b]/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30 font-medium"
                : "text-slate-400 font-normal hover:bg-white/5 hover:text-white"
            }`
          }
        >
          ◈ Clinical Intelligence
        </NavLink>

        <NavLink 
          to="/reports" 
          className={({ isActive }) => 
            `group flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-300 ${
              isActive 
                ? "bg-[#1e293b]/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <img 
                src="/reports-icon.png" 
                alt="Reports" 
                className={`h-4 w-4 object-contain transition-all duration-300 ${
                  isActive 
                    ? "[filter:invert(85%)_sepia(45%)_saturate(448%)_hue-rotate(130deg)_brightness(102%)_contrast(106%)] opacity-100 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" 
                    : "[filter:invert(1)] opacity-50 group-hover:opacity-80"
                }`} 
              />
              <span className={isActive ? "font-medium" : "font-normal"}>{t("reportsTab")}</span>
            </>
          )}
        </NavLink>

        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            `rounded-lg px-4 py-2 transition-all duration-300 ${
              isActive 
                ? "bg-[#1e293b]/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30 font-medium" 
                : "text-slate-400 font-normal hover:bg-white/5 hover:text-white"
            }`
          }
        >
          {t("profileTab")}
        </NavLink>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white overflow-hidden">
          {resolvedPhotoUrl && !avatarLoadFailed ? (
            <img
              src={resolvedPhotoUrl}
              alt={resolvedName ? `${resolvedName} avatar` : "User avatar"}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
              onError={() => {
                console.error("[Avatar] navbar image failed to load:", resolvedPhotoUrl);
                setAvatarLoadFailed(true);
              }}
            />
          ) : (
            initials
          )}
        </div>
        <span className="text-gray-300">{resolvedName || t("user")}</span>
        <button className="text-gray-300 transition hover:text-white" onClick={onLogout} type="button">
          {t("logout")}
        </button>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
