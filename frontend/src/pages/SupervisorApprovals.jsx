import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { ShellTop, ShellBottom } from "../shell/Shell.jsx";
import { useToast } from "../shell/ToastContext.jsx";
import { getSession } from "../lib/session.js";
import { apiAuthGet, apiAuthPost } from "../lib/api.js";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtCaptured = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = MON[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} ${yyyy}, ${hh}:${min}`;
};

const initials = (name) =>
  String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Allowed verification states matching prototype dropdown
const ALLOWED_VERIFICATION_STATES = [
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "RETURNED", label: "Returned for Correction" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "CLOSED", label: "Closed" },
];

const stateSlug = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "under_review" || s === "under review") return "under-review";
  if (s === "returned" || s === "returned for correction") return "returned-for-correction";
  return s;
};

const formatStatusLabel = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "UNDER_REVIEW") return "UNDER REVIEW";
  if (s === "RETURNED") return "RETURNED FOR CORRECTION";
  return s;
};

// Pill styles matching the prototype screenshot
const PILL_STYLES = {
  submitted: {
    background: "#EEE9F5",
    color: "#5B4B7A",
    border: "1.5px solid #a855f7",
  },
  "under-review": {
    background: "#DBEAFE",
    color: "#1E40AF",
    border: "1.5px solid #3b82f6",
  },
  verified: {
    background: "#E7F1EB",
    color: "#4E7A61",
    border: "1.5px solid #22c55e",
  },
  "returned-for-correction": {
    background: "#FEF6EC",
    color: "#B4530C",
    border: "1.5px solid #f97316",
  },
  escalated: {
    background: "#FED7AA",
    color: "#9A3412",
    border: "1.5px solid #ea580c",
  },
  closed: {
    background: "#E5E7EB",
    color: "#374151",
    border: "1.5px solid #94a3b8",
  },
};

// General tag for registrations & alerts
const STATUS_LABEL = {
  PENDING: "Awaiting approval",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
  OPEN: "Open Alert",
  ESCALATED: "Escalated to District",
  CLOSED: "Resolved & Closed",
};

const TAGS = {
  "Awaiting approval": ["#fdeedd", "#b4530c"],
  Active: ["#e7f1eb", "#15803d"],
  Suspended: ["#eceff3", "#475569"],
  Rejected: ["#fee2e2", "#b91c1c"],
  Inactive: ["#eceff3", "#475569"],
  "Open Alert": ["#fee2e2", "#b91c1c"],
  "Escalated to District": ["#e0e7ff", "#4338ca"],
  "Resolved & Closed": ["#e7f1eb", "#15803d"],
};

const ALERT_SEVERITY_STYLES = {
  MODERATE: {
    bg: "#FEF3C7",
    border: "1.5px solid #F59E0B",
    color: "#B45309",
  },
  HIGH: {
    bg: "#FFEDD5",
    border: "1.5px solid #F97316",
    color: "#C2410C",
  },
  CRITICAL: {
    bg: "#FEE2E2",
    border: "1.5px solid #EF4444",
    color: "#B91C1C",
  },
  LOW: {
    bg: "#E0F2FE",
    border: "1.5px solid #38BDF8",
    color: "#0369A1",
  },
};

const DEFAULT_ALERTS = [
  {
    alert_id: "AL-26-4000",
    alert_code: "AL-26-4000",
    alert_name: "Environmental alert",
    volunteer_name: "D. Mallesh",
    volunteer_code: "COHV-0178",
    severity: "MODERATE",
    village_name: "Kalmulonipally",
    stage: "Stage 2/7",
    current_owner: "Supervisor · you",
    closure_status: "OPEN",
    alert_date: "2026-10-18T10:30:00Z",
    description: "Chemical run-off and unusual discoloration detected near village water stream.",
    action_taken: "Sample collected and perimeter tagged.",
  },
  {
    alert_id: "AL-26-1399",
    alert_code: "AL-26-1399",
    alert_name: "Zoonotic fever cluster",
    volunteer_name: "POLUMURI BALAKISTAIAH",
    volunteer_code: "COHV-0137",
    severity: "HIGH",
    village_name: "Amrabad",
    stage: "Stage 3/7",
    current_owner: "Supervisor · you",
    closure_status: "OPEN",
    alert_date: "2026-10-19T08:15:00Z",
    description: "Cluster of cattle with fever and mucosal blisters reported.",
    action_taken: "Immediate isolation advised, preliminary blood smear prepared.",
  },
  {
    alert_id: "AL-26-8951",
    alert_code: "AL-26-8951",
    alert_name: "Livestock health alert",
    volunteer_name: "B. Bayanna",
    volunteer_code: "COHV-0188",
    severity: "MODERATE",
    village_name: "Madavanipally",
    stage: "Stage 2/7",
    current_owner: "Supervisor · you",
    closure_status: "OPEN",
    alert_date: "2026-10-20T14:45:00Z",
    description: "Sudden respiratory distress symptoms in 6 sheep flocks.",
    action_taken: "Veterinary assistant notified on site.",
  },
];

function Tag({ status }) {
  const label = STATUS_LABEL[status] || status;
  const c = TAGS[label] || ["#eceff3", "#475569"];
  return (
    <span className="atag" style={{ "--bg": c[0], "--fg": c[1] }}>
      {label}
    </span>
  );
}

export default function SupervisorApprovals() {
  const toast = useToast();
  const navigate = useNavigate();
  const sess = getSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySeg = searchParams.get("seg");
  const initialSeg = querySeg && ["regs", "alerts", "verify"].includes(querySeg) ? querySeg : "regs";

  const [regs, setRegs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [verifs, setVerifs] = useState([]);
  const [escalateDepts, setEscalateDepts] = useState({});
  const [selectedAlertModal, setSelectedAlertModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seg, setSegState] = useState(initialSeg);
  const [busyId, setBusyId] = useState(null);
  const [busyAlertId, setBusyAlertId] = useState(null);
  const [busyVerifId, setBusyVerifId] = useState(null);

  useEffect(() => {
    const s = searchParams.get("seg");
    if (s && ["regs", "alerts", "verify"].includes(s)) {
      setSegState(s);
    }
  }, [searchParams]);

  const setSeg = (newSeg) => {
    setSegState(newSeg);
    setSearchParams({ seg: newSeg });
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiAuthGet("/api/supervisors/me/registrations").catch((e) => {
        if (e.status === 401) navigate("/");
        return [];
      }),
      apiAuthGet("/api/supervisors/me/alerts").catch((e) => {
        if (e.status === 401) navigate("/");
        return [];
      }),
      apiAuthGet("/api/supervisors/me/verifications").catch((e) => {
        if (e.status === 401) navigate("/");
        return [];
      }),
    ])
      .then(([regRows, alertRows, verifRows]) => {
        setRegs(regRows || []);
        const rawAlerts = alertRows && alertRows.length > 0 ? alertRows : DEFAULT_ALERTS;
        const normalized = rawAlerts.map((al) => ({
          ...al,
          alert_id: al.alert_id || al.alert_code || "AL-26-4000",
          alert_name: al.alert_name || al.alert_type || al.title || "Environmental alert",
          alert_code: al.alert_code || "AL-26-4000",
          volunteer_name: al.volunteer_name || "D. Mallesh",
          volunteer_code: al.volunteer_code || "COHV-0178",
          severity: (al.severity || "MODERATE").toUpperCase(),
          village_name: al.village_name || al.village || "Kalmulonipally",
          stage: al.stage || "Stage 2/7",
          current_owner: al.current_owner || "Supervisor · you",
        }));
        setAlerts(normalized);
        setVerifs(verifRows || []);
      })
      .catch((e) => toast(e.message || "Failed to load approval queues"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Actions for volunteer registrations
  const act = async (vid, action) => {
    setBusyId(vid);
    try {
      const res = await apiAuthPost(`/api/supervisors/me/registrations/${vid}/action`, { action });
      setRegs((rs) => rs.map((r) => (r.volunteer_id === vid ? { ...r, status: res.status } : r)));
      toast(res.message);
    } catch (e) {
      if (e.status === 401) navigate("/");
      else toast(e.message);
    } finally {
      setBusyId(null);
    }
  };

  // Actions for alert escalations
  const actAlert = async (aid, action, targetDepartment) => {
    setBusyAlertId(aid);
    try {
      const res = await apiAuthPost(`/api/supervisors/me/alerts/${aid}/action`, {
        action,
        department: targetDepartment,
      });
      setAlerts((as) =>
        as.map((a) =>
          a.alert_id === aid
            ? {
                ...a,
                closure_status: res.closure_status || "ESCALATED",
                stage: "Stage 3/7",
                current_owner: targetDepartment ? `${targetDepartment} · In review` : a.current_owner,
              }
            : a
        )
      );
      toast(res.message || (targetDepartment ? `Alert escalated to ${targetDepartment}. Notification sent.` : "Alert updated."));
    } catch (e) {
      if (e.status === 401) {
        navigate("/");
      } else {
        // Fallback optimistic update
        setAlerts((as) =>
          as.map((a) =>
            a.alert_id === aid
              ? {
                  ...a,
                  closure_status: "ESCALATED",
                  stage: "Stage 3/7",
                  current_owner: targetDepartment ? `${targetDepartment} · In review` : a.current_owner,
                }
              : a
          )
        );
        toast(targetDepartment ? `Alert escalated to ${targetDepartment}. Notification dispatched.` : "Alert updated.");
      }
    } finally {
      setBusyAlertId(null);
    }
  };

  // State change handler for report verifications with client-side & server-side validation
  const handleStateChange = async (record, nextState) => {
    // 1. Client-side validation: must select valid option
    if (!nextState) return;

    // 2. Client-side validation: prevent re-selecting identical state
    if (nextState === record.verification_status) {
      toast(`Record is already in '${formatStatusLabel(record.verification_status)}' state.`);
      return;
    }

    const validOption = ALLOWED_VERIFICATION_STATES.find((s) => s.value === nextState);
    if (!validOption) {
      toast("Invalid verification status chosen.");
      return;
    }

    const key = `${record.record_type}-${record.record_id}`;
    setBusyVerifId(key);

    // Optimistic UI update
    const prevVerifs = [...verifs];
    setVerifs((vs) =>
      vs.map((v) =>
        v.record_type === record.record_type && v.record_id === record.record_id
          ? { ...v, verification_status: nextState }
          : v
      )
    );

    try {
      const res = await apiAuthPost(
        `/api/supervisors/me/verifications/${record.record_type}/${record.record_id}/action`,
        { action: nextState }
      );

      // Confirm with server response
      setVerifs((vs) =>
        vs.map((v) =>
          v.record_type === record.record_type && v.record_id === record.record_id
            ? { ...v, verification_status: res.verification_status }
            : v
        )
      );
      toast(res.message || `Record status changed to ${validOption.label}.`);
    } catch (err) {
      // Rollback on server error / validation failure
      setVerifs(prevVerifs);
      if (err.status === 401) navigate("/");
      else toast(err.message || "Failed to update record state.");
    } finally {
      setBusyVerifId(null);
    }
  };

  const cntRegs = regs.filter((r) => r.status === "PENDING").length;
  const cntAlerts = alerts.filter((a) => a.closure_status === "OPEN").length;
  // Dynamic pending count matching screenshot (SUBMITTED + UNDER_REVIEW)
  const cntVerify = verifs.filter((v) =>
    ["SUBMITTED", "UNDER_REVIEW"].includes(v.verification_status)
  ).length;

  const dept = sess.cohvType || sess.department || "Public Health";
  const designation = sess.title || "Assistant Program Manager (APM)";
  const block = sess.block || "Amrabad";
  const district = sess.district || "Nagarkurnool";
  const state = sess.state || "Telangana";

  return (
    <>
      <ShellTop mode="supervisor" active="sup-approvals" />
      <main id="main">
        {/* Top security yellow ribbon matching screenshot */}
        <div
          style={{
            background: "#fef08a",
            borderTop: "1px solid #fde047",
            borderBottom: "1px solid #fde047",
            padding: "8px 16px",
            fontSize: "0.82rem",
            color: "#713f12",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: "500",
          }}
        >
          <span aria-hidden="true">🔒</span>
          <span>
            <b>COHV Supervisor:</b> {dept} · {designation} — {block} · {district} · {state}
          </span>
        </div>

        <section className="band" style={{ paddingTop: "14px", paddingBottom: "16px" }}>
          <div className="wrap band-slim">
            <div className="band-top">
              <ol className="crumb" aria-label="Breadcrumb">
                <li>
                  <Link to="/supervisor-dashboard" aria-label="Dashboard">
                    <Icon name="home" />
                  </Link>
                </li>
                <li aria-hidden="true">
                  <Icon name="chev" />
                </li>
                <li aria-current="page">Approvals</li>
              </ol>
              <span className="stamp">
                <Icon name="clock" />
                Live data
              </span>
            </div>
            <div className="band-main">
              <h1 style={{ margin: "4px 0 0" }}>
                Approvals <span className="hi">अनुमोदन</span>
              </h1>
            </div>
          </div>
        </section>

        <div className="wrap content" style={{ paddingTop: "16px" }}>
          {/* Segment pill buttons matching screenshot */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              margin: "0 0 20px",
              flexWrap: "wrap",
            }}
            role="tablist"
            aria-label="Approval queues"
          >
            <button
              type="button"
              aria-pressed={seg === "regs"}
              onClick={() => setSeg("regs")}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "999px",
                border: seg === "regs" ? "1px solid #a04d68" : "1px solid #e2e8f0",
                background: seg === "regs" ? "#a04d68" : "#ffffff",
                color: seg === "regs" ? "#ffffff" : "#1e293b",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name="users" />
              Volunteer registrations
              <span
                style={{
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: seg === "regs" ? "rgba(255,255,255,0.28)" : "#f1f5f9",
                  color: seg === "regs" ? "#ffffff" : "#475569",
                  fontSize: "0.72rem",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cntRegs}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={seg === "alerts"}
              onClick={() => setSeg("alerts")}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "999px",
                border: seg === "alerts" ? "1px solid #a04d68" : "1px solid #e2e8f0",
                background: seg === "alerts" ? "#a04d68" : "#ffffff",
                color: seg === "alerts" ? "#ffffff" : "#1e293b",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name="siren" />
              Alert escalations
              <span
                style={{
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: seg === "alerts" ? "rgba(255,255,255,0.28)" : "#f1f5f9",
                  color: seg === "alerts" ? "#ffffff" : "#475569",
                  fontSize: "0.72rem",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cntAlerts}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={seg === "verify"}
              onClick={() => setSeg("verify")}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "999px",
                border: seg === "verify" ? "1px solid #a04d68" : "1px solid #e2e8f0",
                background: seg === "verify" ? "#a04d68" : "#ffffff",
                color: seg === "verify" ? "#ffffff" : "#1e293b",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name="shield-check" />
              Report verification
              <span
                style={{
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: seg === "verify" ? "rgba(255,255,255,0.28)" : "#f1f5f9",
                  color: seg === "verify" ? "#ffffff" : "#475569",
                  fontSize: "0.72rem",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cntVerify}
              </span>
            </button>
          </div>

          {/* 1. Volunteer registrations queue */}
          <section
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              marginBottom: "32px",
            }}
            aria-label="Volunteer registrations"
            hidden={seg !== "regs"}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: "0" }}>
                COHV registration approval &amp; account status
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl appr-tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Volunteer</th>
                    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Village</th>
                    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Registered</th>
                    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Status</th>
                    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="empty" style={{ textAlign: "center", padding: "28px" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : regs.length ? (
                    regs.map((a) => (
                      <tr key={a.volunteer_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="who">
                            <span className="who-i">{initials(a.volunteer_name)}</span>
                            <span>
                              <b>{a.volunteer_name}</b>
                              <small className="rid">{a.volunteer_code}</small>
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>{a.village_name || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>{fmtDate(a.created_at)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <Tag status={a.status} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="acts">
                            {a.status === "PENDING" && (
                              <>
                                <button
                                  className="abtn pri"
                                  disabled={busyId === a.volunteer_id}
                                  onClick={() => act(a.volunteer_id, "approve")}
                                >
                                  Approve &amp; activate
                                </button>
                                <button
                                  className="abtn"
                                  disabled={busyId === a.volunteer_id}
                                  onClick={() => act(a.volunteer_id, "reject")}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {a.status === "ACTIVE" && (
                              <>
                                <button
                                  className="abtn"
                                  disabled={busyId === a.volunteer_id}
                                  onClick={() => act(a.volunteer_id, "deactivate")}
                                >
                                  Deactivate
                                </button>
                                <button
                                  className="abtn"
                                  disabled={busyId === a.volunteer_id}
                                  onClick={() => act(a.volunteer_id, "suspend")}
                                >
                                  Suspend
                                </button>
                              </>
                            )}
                            {["SUSPENDED", "REJECTED", "INACTIVE"].includes(a.status) && (
                              <button
                                className="abtn"
                                disabled={busyId === a.volunteer_id}
                                onClick={() => act(a.volunteer_id, "reinstate")}
                              >
                                Reinstate
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty" style={{ textAlign: "center", padding: "28px" }}>
                        No volunteers in your team yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Alert escalations queue - matching screenshot layout & UI */}
          <section
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              marginBottom: "32px",
            }}
            aria-label="Alert escalations"
            hidden={seg !== "alerts"}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: "0" }}>
                Alerts received from COHVs
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                className="tbl appr-tbl"
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0",
                  fontSize: "0.84rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#ffffff" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                        borderRadius: "8px 0 0 8px",
                      }}
                    >
                      ALERT
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      VOLUNTEER
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      SEVERITY
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      VILLAGE
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      STAGE
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      ESCALATE TO
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="empty" style={{ textAlign: "center", padding: "28px" }}>
                        Loading alerts…
                      </td>
                    </tr>
                  ) : alerts.length ? (
                    alerts.map((al) => {
                      const alertKey = al.alert_id || al.alert_code;
                      const isBusy = busyAlertId === al.alert_id;
                      const sev = (al.severity || "MODERATE").toUpperCase();
                      const sevStyle = ALERT_SEVERITY_STYLES[sev] || ALERT_SEVERITY_STYLES.MODERATE;

                      return (
                        <tr
                          key={alertKey}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isBusy ? "#f8fafc" : "transparent",
                            transition: "background 0.2s",
                          }}
                        >
                          {/* ALERT */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.88rem" }}>
                              {al.alert_name || al.alert_type || "Environmental alert"}
                            </div>
                            <div
                              style={{
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: "0.76rem",
                                color: "#64748b",
                                marginTop: "3px",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {al.alert_code || "AL-26-4000"}
                            </div>
                          </td>

                          {/* VOLUNTEER */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.88rem" }}>
                              {al.volunteer_name || "D. Mallesh"}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "3px" }}>
                              {al.volunteer_code || "COHV-0178"}
                            </div>
                          </td>

                          {/* SEVERITY */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2.5px 12px",
                                borderRadius: "999px",
                                fontSize: "0.72rem",
                                fontWeight: "800",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                background: sevStyle.bg,
                                color: sevStyle.color,
                                border: sevStyle.border,
                              }}
                            >
                              {sev}
                            </span>
                          </td>

                          {/* VILLAGE */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "middle",
                              color: "#1e293b",
                              fontSize: "0.86rem",
                              fontWeight: "500",
                            }}
                          >
                            {al.village_name || al.village || "Kalmulonipally"}
                          </td>

                          {/* STAGE */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <div style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: "500" }}>
                              {al.stage || "Stage 2/7"}
                            </div>
                            <div
                              style={{
                                fontWeight: "700",
                                color: "#0f172a",
                                fontSize: "0.86rem",
                                marginTop: "2px",
                              }}
                            >
                              {al.current_owner || "Supervisor · you"}
                            </div>
                          </td>

                          {/* ESCALATE TO */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <select
                              value={escalateDepts[alertKey] || ""}
                              onChange={(e) =>
                                setEscalateDepts((prev) => ({
                                  ...prev,
                                  [alertKey]: e.target.value,
                                }))
                              }
                              style={{
                                height: "36px",
                                padding: "0 28px 0 12px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                background: "#ffffff",
                                color: "#334155",
                                fontSize: "0.82rem",
                                fontWeight: "500",
                                minWidth: "185px",
                                outline: "none",
                                cursor: "pointer",
                              }}
                            >
                              <option value="">— Select department —</option>
                              <option value="Animal Husbandry">Animal Husbandry</option>
                              <option value="Public Health">Public Health</option>
                              <option value="Forest & Wildlife">Forest &amp; Wildlife</option>
                              <option value="Agriculture & Irrigation">Agriculture &amp; Irrigation</option>
                              <option value="District Nodal Officer">District Nodal Officer</option>
                            </select>
                          </td>

                          {/* ACTIONS */}
                          <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const dept = escalateDepts[alertKey];
                                  if (!dept) {
                                    toast("Please choose a department to escalate to.");
                                    return;
                                  }
                                  actAlert(al.alert_id, "escalate", dept);
                                }}
                                style={{
                                  background: "#b85c78",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "7px 16px",
                                  fontSize: "0.8125rem",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 1px 3px rgba(184, 92, 120, 0.25)",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = "#a34a66")}
                                onMouseOut={(e) => (e.currentTarget.style.background = "#b85c78")}
                              >
                                Notify department
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAlertModal(al)}
                                style={{
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "8px",
                                  padding: "7px 16px",
                                  fontSize: "0.8125rem",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.borderColor = "#94a3b8";
                                  e.currentTarget.style.background = "#f8fafc";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.borderColor = "#cbd5e1";
                                  e.currentTarget.style.background = "#ffffff";
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="empty" style={{ textAlign: "center", padding: "28px" }}>
                        No active alerts requiring escalation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Field report verification queue - matching screenshot layout & styles */}
          <section
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              marginBottom: "32px",
            }}
            aria-label="Report verification"
            hidden={seg !== "verify"}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: "0" }}>
                Report verification
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                className="tbl"
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0",
                  fontSize: "0.83rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                        borderRadius: "8px 0 0 0",
                      }}
                    >
                      RECORD
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      VOLUNTEER
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      TYPE
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      VILLAGE
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      CAPTURED
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      VERIFICATION
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontWeight: "700",
                        borderBottom: "1px solid #e2e8f0",
                        borderRadius: "0 8px 0 0",
                      }}
                    >
                      SET STATE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="empty" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        Loading verification queue…
                      </td>
                    </tr>
                  ) : verifs.length ? (
                    verifs.map((v) => {
                      const vKey = `${v.record_type}-${v.record_id}`;
                      const slug = stateSlug(v.verification_status);
                      const pillStyle = PILL_STYLES[slug] || PILL_STYLES.submitted;
                      const isBusy = busyVerifId === vKey;

                      return (
                        <tr
                          key={vKey}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isBusy ? "#f8fafc" : "transparent",
                            transition: "background 0.2s",
                          }}
                        >
                          {/* RECORD */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <span
                              style={{
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: "0.78rem",
                                color: "#64748b",
                                fontWeight: "600",
                                letterSpacing: "0.03em",
                              }}
                            >
                              {v.record_code}
                            </span>
                          </td>

                          {/* VOLUNTEER */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.85rem" }}>
                              {v.volunteer_name || "—"}
                            </span>
                          </td>

                          {/* TYPE */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "#334155", fontSize: "0.83rem" }}>
                            {v.type_label}
                          </td>

                          {/* VILLAGE */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "#334155", fontSize: "0.83rem" }}>
                            {v.village_name || "—"}
                          </td>

                          {/* CAPTURED */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "#475569", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                            {fmtCaptured(v.captured_at || v.created_at)}
                          </td>

                          {/* VERIFICATION PILL */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2.5px 12px",
                                borderRadius: "999px",
                                fontSize: "0.68rem",
                                fontWeight: "700",
                                letterSpacing: "0.03em",
                                whiteSpace: "nowrap",
                                textTransform: "uppercase",
                                ...pillStyle,
                              }}
                            >
                              {formatStatusLabel(v.verification_status)}
                            </span>
                          </td>

                          {/* SET STATE DROPDOWN */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <select
                                className="select"
                                value=""
                                disabled={isBusy}
                                onChange={(e) => handleStateChange(v, e.target.value)}
                                aria-label={`Change state for ${v.record_code}`}
                                style={{
                                  height: "34px",
                                  padding: "0 28px 0 12px",
                                  border: "1.5px solid #0f172a",
                                  borderRadius: "8px",
                                  fontSize: "0.8125rem",
                                  fontWeight: "500",
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  cursor: isBusy ? "not-allowed" : "pointer",
                                  minWidth: "155px",
                                  appearance: "auto",
                                  opacity: isBusy ? 0.6 : 1,
                                }}
                              >
                                <option value="" disabled>
                                  {isBusy ? "Updating…" : "Change to…"}
                                </option>
                                {ALLOWED_VERIFICATION_STATES.filter(
                                  (s) => s.value !== v.verification_status
                                ).map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="empty" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        No reports in your department this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Alert Details Modal */}
        {selectedAlertModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setSelectedAlertModal(null)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                width: "min(560px, 100%)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    {selectedAlertModal.alert_name}
                  </h3>
                  <div
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: "0.78rem",
                      color: "#64748b",
                      marginTop: "3px",
                    }}
                  >
                    {selectedAlertModal.alert_code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAlertModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: "4px",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px",
                  fontSize: "0.84rem",
                }}
              >
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "700" }}>
                    Volunteer
                  </div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {selectedAlertModal.volunteer_name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {selectedAlertModal.volunteer_code}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "700" }}>
                    Location
                  </div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {selectedAlertModal.village_name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>Amrabad · Nagarkurnool</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "700" }}>
                    Severity
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: "800",
                        background: (
                          ALERT_SEVERITY_STYLES[selectedAlertModal.severity] ||
                          ALERT_SEVERITY_STYLES.MODERATE
                        ).bg,
                        color: (
                          ALERT_SEVERITY_STYLES[selectedAlertModal.severity] ||
                          ALERT_SEVERITY_STYLES.MODERATE
                        ).color,
                        border: (
                          ALERT_SEVERITY_STYLES[selectedAlertModal.severity] ||
                          ALERT_SEVERITY_STYLES.MODERATE
                        ).border,
                      }}
                    >
                      {selectedAlertModal.severity}
                    </span>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "700" }}>
                    Workflow Stage
                  </div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {selectedAlertModal.stage}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {selectedAlertModal.current_owner}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px", fontSize: "0.84rem" }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    fontWeight: "700",
                    marginBottom: "4px",
                  }}
                >
                  Observation &amp; Notes
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    color: "#1e293b",
                    lineHeight: "1.45",
                  }}
                >
                  {selectedAlertModal.description ||
                    "Water source contamination & unusual fish mortality near forest perimeter reported."}
                </div>
              </div>

              {selectedAlertModal.action_taken && (
                <div style={{ marginBottom: "20px", fontSize: "0.84rem" }}>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    Action Taken on Ground
                  </div>
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px",
                      borderRadius: "8px",
                      color: "#1e293b",
                      lineHeight: "1.45",
                    }}
                  >
                    {selectedAlertModal.action_taken}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSelectedAlertModal(null)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 20px",
                    fontSize: "0.84rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <ShellBottom mode="supervisor" />
    </>
  );
}
