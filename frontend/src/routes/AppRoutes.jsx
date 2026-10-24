import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../components/auth/Login.jsx";
import SupervisorDashboard from "../features/Dashboard/Supervisor/pages/SupervisorDashboardPage.jsx";
import SupervisorApprovals from "../pages/SupervisorApprovals.jsx";
import ReportPage from "../features/report/pages/ReportPage.jsx";
import NotFound from "../pages/NotFound.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute requiredRole="supervisor" />}>
        <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
        <Route path="/supervisor-approvals" element={<SupervisorApprovals />} />
        <Route path="/supervisor-reports" element={<ReportPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
