import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const userRole = String(user?.role || "").toLowerCase();
  const allowedRoles = (roles || []).map((role) => String(role).toLowerCase());


  if (!user) return <Navigate to="/login" replace />;
  if (roles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default ProtectedRoute;
