import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { ShellTop, ShellBottom } from "../shell/Shell.jsx";
import { useToast } from "../shell/ToastContext.jsx";
import { getSession } from "../lib/session.js";
import { apiAuthGet } from "../lib/api.js";
import DataMapSection from "../features/Dashboard/Supervisor/components/DataMapSection.jsx";
import { getSupervisorVolunteers, getSupervisorGeoData } from "../features/Dashboard/Supervisor/service.js";
import "../features/Dashboard/Supervisor/supervisor.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const SECTOR = { "Public Health": "human", Animal: "animal", Wildlife: "wildlife", Environment: "environment" };
const PILL = { human: "#a04d68", animal: "#c2410c", wildlife: "#5f2d91", environment: "#15803d" };

function Tile({ k, main }) {
  const word = /^[A-Za-z]/.test(String(k.v));
  const body = (
    <div className="txt">
      <span className="l"><Icon name={k.icon} />{k.label}</span>
      <b className={`v num${word ? " word" : ""}`}>{k.v}</b>
      <div className="delta">{k.sub || ""}</div>
    </div>
  );
  const tip = k.tip && (
    <>
      <span className="kinfo" tabIndex={0} role="button" aria-label={`About this figure: ${k.label}`}><Icon name="info" /></span>
      <span className="ktip" role="tooltip">{k.tip}</span>
    </>
  );
  if (k.href) {
    return (
      <Link className={`card kpi kpi-link${main ? " main" : ""}`} to={k.href}>
        {body}{tip}<span className="golnk">Open <Icon name="arrow" /></span>
      </Link>
    );
  }
  return <div className={`card kpi${main ? " main" : ""}`}>{body}{tip}</div>;
}

export default function SupervisorDashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const sess = getSession();
  const sector = SECTOR[sess.cohvType] || "human";

  const [summary, setSummary] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [shownMetrics, setShownMetrics] = useState({
    events: true,
    referrals: true,
    samples: true,
    awareness: true,
    imparted: true,
    attended: true,
  });

  const handleToggleMetric = (key) => {
    setShownMetrics((prev) => {
      const nextVal = !prev[key];
      const currentActiveCount = Object.values(prev).filter(Boolean).length;
      if (!nextVal && currentActiveCount <= 1) return prev;
      return { ...prev, [key]: nextVal };
    });
  };

  useEffect(() => {
    apiAuthGet("/api/supervisors/me/summary")
      .then(setSummary)
      .catch((e) => {
        if (e.status === 401) navigate("/");
        else toast(e.message);
      });

    getSupervisorVolunteers(sess.supId)
      .then(setVolunteers)
      .catch(console.error);

    getSupervisorGeoData()
      .then(setGeoData)
      .catch(console.error);
  }, [sess.supId]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = summary || {};
  const glance = [
    { icon: "users", label: "COHVs supervised", v: fmt(s.team_total || volunteers.length), sub: "In your team", tip: "Community volunteers reporting to you." },
    { icon: "shield-check", label: "Awaiting verification", v: fmt(s.awaiting_verification), sub: "Records to verify", href: "/supervisor-approvals?seg=verify", tip: "Field records your team submitted that are still Submitted or Under Review. Opens Report verification." },
    { icon: "siren", label: "Open alerts", v: fmt(s.open_alerts), sub: "Need escalation", href: "/supervisor-approvals?seg=alerts", tip: "Alerts raised by your volunteers not yet closed. Opens Alert escalations." },
    { icon: "check", label: "Pending COHV approvals", v: fmt(s.pending_approvals), sub: "New volunteers", href: "/supervisor-approvals?seg=regs", tip: "Volunteer registrations awaiting your approval. Opens Approvals." },
    { icon: "share", label: "Referrals to follow up", v: fmt(s.referrals_followup), sub: "Awaiting follow-up", href: "/supervisor-reports?tab=referrals", tip: "Referrals your team made that are not yet closed. Opens Referrals & follow-up." },
  ];
  const kpis = [
    { icon: "mappin", label: "Total visits", v: fmt(s.total_visits) },
    { icon: "siren", label: "Alerts generated", v: fmt(s.alerts_generated) },
    { icon: "share", label: "Referrals", v: fmt(s.referrals), href: "/supervisor-reports?tab=referrals" },
    { icon: "timer", label: "Pending follow-ups", v: fmt(s.referrals_followup), href: "/supervisor-reports?tab=referrals" },
    { icon: "megaphone", label: "Awareness activities", v: fmt(s.awareness) },
    { icon: "grad", label: "Trainings imparted", v: fmt(s.trainings_imparted) },
    { icon: "book", label: "Trainings attended", v: fmt(s.trainings_attended) },
    { icon: "sync", label: "Meetings", v: fmt(s.meetings) },
  ];

  const profile = useMemo(() => ({
    id: sess.supId || "SUP-042",
    title: sess.title || sess.name || "Assistant Program Manager (APM)",
    name: sess.name || "Supervisor",
    block: sess.block || "Amrabad",
    district: sess.district || "Nagarkurnool",
    state: sess.state || "Telangana",
    pillarLabel: sess.pillarLabel || sess.cohvType || "Public Health Department",
  }), [sess]);

  return (
    <>
      <ShellTop mode="supervisor" active="sup-dashboard" />
      <main id="main">
        <section className="band">
          <div className="wrap band-slim">
            <div className="band-top">
              <ol className="crumb" aria-label="Breadcrumb">
                <li><Link to="/supervisor-dashboard" aria-label="Dashboard"><Icon name="home" /></Link></li>
                <li aria-hidden="true"><Icon name="chev" /></li>
                <li aria-current="page">Supervisor dashboard</li>
              </ol>
              <span className="stamp"><Icon name="clock" />Live data</span>
            </div>
            <div className="band-main">
              <h1>COHV Supervisor Dashboard <span className="hi">सामुदायिक स्वयंसेवक पर्यवेक्षक</span></h1>
            </div>
          </div>
        </section>

        <div className="wrap content">
          <p className="showing" role="status">
            <Icon name="info" />
            <span>Showing <b>{sess.title || sess.name || "Supervisor"}</b>{sess.cohvType ? <> · <b>{sess.cohvType} · {fmt(s.team_total || volunteers.length)} volunteer{(s.team_total || volunteers.length) === 1 ? "" : "s"}</b></> : null}{sess.block ? <> · <b>{sess.block}, {sess.district}, {sess.state}</b></> : null}</span>
          </p>

          <div className="sec-h"><h2>At a Glance</h2><span>What needs your attention on your team</span></div>
          <section className="kpis five" aria-label="Key figures for your team">
            {glance.map((k, i) => <Tile key={k.label} k={k} main={i === 0} />)}
          </section>

          <div className="sec-h"><h2>Where your team works</h2><span>Field activity in your area</span></div>
          <DataMapSection
            profile={profile}
            volunteers={volunteers}
            geoData={geoData}
            shownMetrics={shownMetrics}
            onToggleMetric={handleToggleMetric}
          />

          <div className="sec-h"><h2>Performance &amp; KPIs</h2><span>Your team's totals — the indicators the volunteers see in their app</span></div>
          <section className="kpis eight" aria-label="Team totals">
            {kpis.map((k) => <Tile key={k.label} k={k} main />)}
          </section>

          <div className="sec-h"><h2>Approvals &amp; Reports</h2><span>Review and sign off your team's work</span></div>
          <section className="sv-jump">
            <Link className="sv-jcard" to="/supervisor-approvals">
              <span className="sv-jico" aria-hidden="true"><Icon name="clipboard" /></span>
              <span className="sv-jb"><b>Approvals</b><small>COHV registrations · Alert escalations · Record verification</small></span>
              <Icon name="arrow" className="i arr" />
            </Link>
            <Link className="sv-jcard" to="/supervisor-reports">
              <span className="sv-jico" aria-hidden="true"><Icon name="file" /></span>
              <span className="sv-jb"><b>Reports</b><small>Monthly / Quarterly / Annual · Referrals · Data quality · Export</small></span>
              <Icon name="arrow" className="i arr" />
            </Link>
          </section>
        </div>
      </main>
      <ShellBottom mode="supervisor" />
    </>
  );
}
