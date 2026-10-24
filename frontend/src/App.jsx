import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconSprite } from "./lib/icons.jsx";
import { clearSession, getSession } from "./lib/session.js";
import AppRoutes from "./routes/AppRoutes.jsx";
import { ToastProvider, useToast } from "./shell/ToastContext.jsx";

function SessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    const checkExpiry = () => {
      if (location.pathname.startsWith("/supervisor")) {
        const session = getSession();
        if (!session?.role || !session?.supId) {
          clearSession();
          toast("Your session has expired after 2 days. Please sign in again.");
          navigate("/", { replace: true });
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExpiry();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [location.pathname, navigate, toast]);

  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <IconSprite />
      <SessionWatcher />
      <a className="skip" href="#main">Skip to main content</a>
      <AppRoutes />
    </ToastProvider>
  );
}

