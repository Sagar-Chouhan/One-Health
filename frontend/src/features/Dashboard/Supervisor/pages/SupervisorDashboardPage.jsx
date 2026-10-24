import React, { useEffect, useState } from "react";
import { ShellTop, ShellBottom } from "../../../../shell/Shell.jsx";
import SupervisorRail from "../components/SupervisorRail.jsx";
import SupervisorWelcome from "../components/SupervisorWelcome.jsx";
import AtAGlanceTiles from "../components/AtAGlanceTiles.jsx";
import DataMapSection from "../components/DataMapSection.jsx";
import PerformanceKPIs from "../components/PerformanceKPIs.jsx";
import ApprovalsReportsJump from "../components/ApprovalsReportsJump.jsx";
import {
  getSupervisorProfile,
  getSupervisorSummary,
  getSupervisorVolunteers,
  getSupervisorGeoData
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
    attended: true
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
          getSupervisorGeoData()
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

  return (
    <>
      <ShellTop mode="supervisor" active="sup-dashboard" />

      <div className="sup-shell" id="main">
        {/* Left rail — section anchors */}
        <SupervisorRail />

        {/* Main content column */}
        <main className="sup-main">
          {/* Section 1: Overview */}
          <section id="sec-overview" className="sup-view" aria-label="Team Overview">
            <SupervisorWelcome profile={profile} teamCount={volunteers.length} />

            <div className="sup-view-h">
              <h2>At a Glance</h2>
            </div>
            <AtAGlanceTiles summary={summary} teamCount={volunteers.length} />
          </section>

          {/* Section 2: Data Map + Volunteer Performance Chart */}
          <DataMapSection
            profile={profile}
            volunteers={volunteers}
            geoData={geoData}
            shownMetrics={shownMetrics}
            onToggleMetric={handleToggleMetric}
          />

          {/* Section 3: Performance indicators & KPIs */}
          <PerformanceKPIs summary={summary} />

          {/* Section 4: Quick Jump Cards for Approvals & Reports */}
          <ApprovalsReportsJump />
        </main>
      </div>

      <ShellBottom mode="supervisor" />
    </>
  );
}
