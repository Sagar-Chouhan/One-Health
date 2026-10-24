import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShellTop, ShellBottom } from "../shell/Shell.jsx";
import { Icon } from "../lib/icons.jsx";
import { getSession } from "../lib/session.js";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const sess = getSession();
  const isSupervisor = !!sess?.token;

  return (
    <>
      <ShellTop mode={isSupervisor ? "supervisor" : "login"} active="" />
      <main id="main">
        <section className="band">
          <div className="wrap band-slim">
            <div className="band-top">
              <ol className="crumb" aria-label="Breadcrumb">
                <li>
                  <Link to={isSupervisor ? "/supervisor-dashboard" : "/"} aria-label="Home">
                    <Icon name="home" />
                  </Link>
                </li>
                <li aria-hidden="true"><Icon name="chev" /></li>
                <li aria-current="page">404 Not Found</li>
              </ol>
            </div>
            <div className="band-main">
              <h1>Page Not Found <span className="hi">पृष्ठ नहीं मिला</span></h1>
            </div>
          </div>
        </section>

        <div className="wrap content" style={{ padding: "40px 16px 80px", textAlign: "center" }}>
          <div
            className="card"
            style={{
              maxWidth: "680px",
              margin: "0 auto",
              padding: "48px 32px",
              borderRadius: "14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(184, 92, 120, 0.12)",
                color: "var(--rose-deep, #802b48)",
                padding: "6px 18px",
                borderRadius: "999px",
                fontWeight: "800",
                fontSize: "1.1rem",
                letterSpacing: "0.05em",
                marginBottom: "20px",
              }}
            >
              <Icon name="info" />
              <span>HTTP 404</span>
            </div>

            <h2
              style={{
                fontSize: "1.85rem",
                fontWeight: "800",
                color: "var(--ink, #1f2937)",
                margin: "0 0 12px",
              }}
            >
              The requested page is unavailable
            </h2>

            <p
              style={{
                color: "var(--ink-500, #64748b)",
                fontSize: "1rem",
                lineHeight: "1.6",
                maxWidth: "520px",
                margin: "0 auto 16px",
              }}
            >
              The address <code>{location.pathname}</code> does not match any route in the One Health portal, or may have been updated or moved.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: "28px",
              }}
            >
              {isSupervisor ? (
                <Link
                  to="/supervisor-dashboard"
                  className="abtn pri"
                  style={{
                    height: "42px",
                    padding: "0 22px",
                    fontSize: "0.95rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="home" /> Return to Dashboard
                </Link>
              ) : (
                <Link
                  to="/"
                  className="abtn pri"
                  style={{
                    height: "42px",
                    padding: "0 22px",
                    fontSize: "0.95rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="home" /> Back to Sign In / Home
                </Link>
              )}

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="abtn"
                style={{
                  height: "42px",
                  padding: "0 20px",
                  fontSize: "0.95rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>

            {isSupervisor && (
              <div
                style={{
                  marginTop: "32px",
                  paddingTop: "24px",
                  borderTop: "1px solid var(--line-2, #e5e7eb)",
                  display: "flex",
                  justifyContent: "center",
                  gap: "24px",
                  fontSize: "0.875rem",
                }}
              >
                <Link to="/supervisor-approvals?seg=regs" style={{ color: "var(--rose-deep, #802b48)", fontWeight: "600" }}>
                  Approvals Queue
                </Link>
                <Link to="/supervisor-reports" style={{ color: "var(--rose-deep, #802b48)", fontWeight: "600" }}>
                  Reports &amp; Surveillance
                </Link>
                <Link to="/supervisor-approvals?seg=alerts" style={{ color: "var(--rose-deep, #802b48)", fontWeight: "600" }}>
                  Active Alerts
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <ShellBottom mode={isSupervisor ? "supervisor" : "public"} />
    </>
  );
}
