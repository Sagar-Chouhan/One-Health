import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShellTop, ShellBottom } from "../../../../shell/Shell.jsx";
import { Icon } from "../../../../lib/icons.jsx";
import AtAGlanceTiles from "../components/AtAGlanceTiles.jsx";
import DataMapSection from "../components/DataMapSection.jsx";
import PerformanceKPIs from "../components/PerformanceKPIs.jsx";
import ApprovalsReportsJump from "../components/ApprovalsReportsJump.jsx";
import {
  getSupervisorProfile,
  getSupervisorSummary,
  getSupervisorVolunteers,
  getSupervisorGeoData,
} from "../service.js";
import "../supervisor.css";

export default function SupervisorDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronized metrics visibility for both map and chart
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
      // Do not allow turning off the very last active metric
      if (!nextVal && currentActiveCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: nextVal };
    });
  };

  useEffect(() => {
    let alive = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const prof = await getSupervisorProfile();
        if (!alive) return;
        setProfile(prof);

        const [sum, vols, geo] = await Promise.all([
          getSupervisorSummary(prof.id),
          getSupervisorVolunteers(prof.id),
          getSupervisorGeoData(),
        ]);

        if (!alive) return;
        setSummary(sum);
        setVolunteers(vols);
        setGeoData(geo);
      } catch (err) {
        console.error("Error loading supervisor dashboard:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      alive = false;
    };
  }, []);

  const p = profile || {};
  const teamCount = volunteers.length > 0 ? volunteers.length : 9;
  const rawTitle = p.title || p.designation || "Medical Officer, PHC";
  const cleanTitle = p.name && rawTitle.includes(p.name)
    ? rawTitle.replace(p.name, "").replace(/^\s*[·\-–—,]\s*/, "").trim() || "Medical Officer, PHC"
    : rawTitle;
  const scopeText = [p.block || "Amrabad", p.district || "Nagarkurnool", p.state || "Telangana"]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <ShellTop mode="supervisor" active="sup-dashboard" />

      {/* Top Peach Banner matching One Health specification & screenshot */}
      <section className="band">
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
              <li aria-current="page">Supervisor dashboard</li>
            </ol>
            <span className="stamp">
              <Icon name="clock" />
              Live data
            </span>
          </div>

          <div className="title" style={{ marginTop: "8px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1e293b", margin: 0, lineHeight: 1.2 }}>
              COHV Supervisor Dashboard
              <span
                className="hi"
                style={{
                  display: "block",
                  fontSize: "0.92rem",
                  fontWeight: "600",
                  color: "#983B59",
                  marginTop: "3px",
                }}
              >
                सामुदायिक स्वयंसेवक पर्यवेक्षक
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* Main Full-Width Content */}
      <main className="wrap content" id="main" style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 24px 48px" }}>
        {/* Info Sub-banner */}
        <div className="showing" style={{ margin: "4px 0 24px 0", fontSize: "0.86rem", color: "#475569" }}>
          <Icon name="info" />
          <span>
            Showing <b>{p.name || "Dr. Ravi Kumar"}</b> · <b>{cleanTitle}</b> ·{" "}
            <b>{p.pillarLabel || "Public Health"}</b> · <b>{teamCount} volunteers</b> · <b>{scopeText}</b>
          </span>
        </div>

        {/* Section 1: At a Glance */}
        <section aria-label="At a Glance" className="sup-section">
          <div className="sec-h">
            <h2>At a Glance</h2>
            <span>What needs your attention on your team</span>
          </div>
          <AtAGlanceTiles summary={summary} teamCount={teamCount} />
        </section>

        {/* Section 2: Where your team works (Data Map kept as is) */}
        <section aria-label="Where your team works" className="sup-section">
          <div className="sec-h">
            <h2>Where your team works</h2>
            <span>Field activity in your area</span>
          </div>
          <DataMapSection
            profile={profile}
            volunteers={volunteers}
            geoData={geoData}
            shownMetrics={shownMetrics}
            onToggleMetric={handleToggleMetric}
          />
        </section>

        {/* Section 3: Performance & KPIs */}
        <section aria-label="Performance and KPIs" className="sup-section">
          <div className="sec-h">
            <h2>Performance &amp; KPIs</h2>
            <span>Your team's totals — the indicators the volunteers see in their app</span>
          </div>
          <PerformanceKPIs summary={summary} />
        </section>

        {/* Section 4: Approvals & Reports */}
        <section aria-label="Approvals and Reports" className="sup-section">
          <div className="sec-h">
            <h2>Approvals &amp; Reports</h2>
            <span>Review and sign off your team's work</span>
          </div>
          <ApprovalsReportsJump />
        </section>
      </main>

      <ShellBottom mode="supervisor" />
    </>
  );
}
