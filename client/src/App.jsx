import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import FamilyViewPage from "./pages/FamilyViewPage";
import ProfilePage from "./pages/ProfilePage";
import ReportsPage from "./pages/ReportsPage";
import GraphRagPage from "./pages/GraphRagPage";


const Nav = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  return (
    <nav className="sticky top-0 z-40 mx-3 mt-3 flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#0b1730]/72 px-5 shadow-[0_6px_20px_rgba(2,6,23,0.3)] backdrop-blur-xl md:mx-6 md:px-7">
      <div className="text-base font-semibold tracking-tight text-slate-100">{t("appName")}</div>
      <div className="hidden items-center gap-7 text-sm text-slate-300 lg:flex">
        {!user && (
          <>
            <a className="transition-colors duration-200 hover:text-cyan-200" href="#features">Features</a>
            <a className="transition-colors duration-200 hover:text-cyan-200" href="#how-it-works">How It Works</a>
            <a className="transition-colors duration-200 hover:text-cyan-200" href="#resources">Resources</a>
            <a className="transition-colors duration-200 hover:text-cyan-200" href="#contact">Contact</a>
          </>
        )}
        {user && <Link className="transition-colors duration-200 hover:text-cyan-200" to="/dashboard">{t("dashboard")}</Link>}
        {isAdmin && <Link className="transition-colors duration-200 hover:text-cyan-200" to="/admin">{t("admin")}</Link>}
      </div>
      <div className="flex items-center gap-2.5 text-sm text-slate-300">
        <button
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 transition hover:border-cyan-200/40 hover:text-cyan-100"
          onClick={() => i18n.changeLanguage(i18n.language === "en" ? "bn" : "en")}
          type="button"
        >
          {t("langToggle")}
        </button>
        {user ? (
          <button className="transition hover:text-cyan-100" onClick={logout} type="button">{t("logout")}</button>
        ) : (
          <Link
            className="rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#14b8a6] px-4 py-2 font-semibold text-[#062036] transition duration-300 hover:brightness-110"
            to="/login"
          >
            {t("login")}
          </Link>
        )}
      </div>
    </nav>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const hideGlobalNav =
    location.pathname === "/dashboard" ||
    location.pathname === "/profile" ||
    location.pathname === "/graphrag";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#061120] text-slate-100">
      {!hideGlobalNav && <Nav />}
      <main className="relative z-10 flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/reports" element={<ReportsPage />} />
          <Route
            path="/graphrag"
            element={
              <ProtectedRoute>
                <GraphRagPage />
              </ProtectedRoute>
            }
          />
          <Route path="/family/:token" element={<FamilyViewPage />} />
        </Routes>

      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
