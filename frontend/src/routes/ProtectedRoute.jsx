import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../lib/session.js";

export default function ProtectedRoute({ requiredRole }) {
  const location = useLocation();
  const session = getSession();
  const authenticated = Boolean(
    session?.role === requiredRole && session?.supId,
  );

  if (!authenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
