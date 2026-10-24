import { apiAuthGet } from "../../../lib/api.js";
import { getSession } from "../../../lib/session.js";
import { loadScript } from "../../../lib/loadScript.js";

// Metrics definitions matching One Health specifications
export const METRICS = [
  { k: "events", l: "Events", c: "#5B8BB8" },
  { k: "referrals", l: "Referrals", c: "#B85C78" },
  { k: "samples", l: "Sample support", c: "#7FA88C" },
  { k: "awareness", l: "Awareness", c: "#D18F6F" },
  { k: "imparted", l: "Trainings imparted", c: "#8B7EC4" },
  { k: "attended", l: "Trainings attended", c: "#E0B341" }
];

export const DEFAULT_SUPERVISOR_ID = "SUP-042";

/**
 * Ensures global datasets are loaded in the browser environment
 */
export async function ensureGlobalData() {
  if (typeof window === "undefined") return;

  const promises = [];
  if (!window.COHV) {
    promises.push(loadScript("/assets/js/cohv-data.js?v=2").catch(() => {}));
  }
  if (!window.OH_SUP_GEO) {
    promises.push(loadScript("/assets/js/sup-geo.js?v=2").catch(() => {}));
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Get the currently active supervisor context and scope
 */
export async function getSupervisorProfile() {
  await ensureGlobalData();
  const session = getSession();
  const cohv = window.COHV || {};
  const supervisors = cohv.supervisors || [];

  // Determine supervisor unit: session supId or fallback to SUP-042 (Amrabad team in screenshot)
  const targetId = session.supId || DEFAULT_SUPERVISOR_ID;
  const unit = supervisors.find((s) => s.id === targetId) ||
    supervisors.find((s) => s.block === "Amrabad") ||
    supervisors[0] || {
      id: DEFAULT_SUPERVISOR_ID,
      title: "Assistant Program Manager (APM)",
      district: "Nagarkurnool",
      block: "Amrabad",
      pillar: "environment",
      pillarLabel: "Environment",
      team: []
    };

  return {
    id: unit.id,
    name: session.name || unit.name || "Dr. Ravi Kumar",
    title: session.title || unit.title || "Medical Officer, PHC",
    designation: session.title || unit.title || "Medical Officer, PHC",
    pillar: unit.pillar || "public_health",
    pillarLabel: session.department || unit.pillarLabel || "Public Health",
    district: session.district || unit.district || "Nagarkurnool",
    block: session.block || unit.block || "Amrabad",
    state: session.state || "Telangana",
    cohvType: session.cohvType || "Public Health",
    email: session.user || "mo.amrabad@onehealth.in",
    teamIds: unit.team || []
  };
}

/**
 * GET At a glance counts and status totals for the supervisor's team
 */
export async function getSupervisorSummary(supervisorId) {
  try {
    const res = await apiAuthGet("/api/supervisors/me/summary");
    if (res && typeof res.team_total !== "undefined") {
      return res;
    }
  } catch (err) {
    // Graceful fallback to computed/mocked metrics
  }

  await ensureGlobalData();
  const vols = await getSupervisorVolunteers(supervisorId);
  const teamTotal = vols.length > 0 ? vols.length : 9;

  return {
    team_total: teamTotal,
    supervised: teamTotal,
    awaiting_verification: 0,
    open_alerts: 0,
    pending_approvals: 1,
    referrals_followup: 0,
    total_visits: 0,
    alerts_generated: 0,
    referrals: 0,
    awareness: 0,
    trainings_imparted: 0,
    trainings_attended: 0,
    meetings: 0,
    samples_supported: 0
  };
}

/**
 * GET volunteers assigned to this supervisor
 */
export async function getSupervisorVolunteers(supervisorId) {
  await ensureGlobalData();
  const cohv = window.COHV || {};
  const allVolunteers = cohv.volunteers || [];
  const targetId = supervisorId || DEFAULT_SUPERVISOR_ID;

  let team = allVolunteers.filter((v) => v.supervisorId === targetId);

  // If none match targetId, fallback to SUP-042 or first supervisor's team
  if (team.length === 0) {
    const defaultSup = (cohv.supervisors || []).find((s) => s.id === DEFAULT_SUPERVISOR_ID);
    if (defaultSup && defaultSup.team) {
      team = allVolunteers.filter((v) => defaultSup.team.includes(v.id));
    }
    if (team.length === 0) {
      team = allVolunteers.filter((v) => v.supervisorId === "SUP-042");
    }
  }

  // Ensure default activity structure exists on each volunteer
  return team.map((v) => ({
    ...v,
    activity: {
      events: v.activity?.events ?? 0,
      referrals: v.activity?.referrals ?? 0,
      samples: v.activity?.samples ?? 0,
      awareness: v.activity?.awareness ?? 0,
      imparted: v.activity?.imparted ?? 0,
      attended: v.activity?.attended ?? 0
    }
  }));
}

/**
 * GET Geo points and district boundary geometries
 */
export async function getSupervisorGeoData() {
  await ensureGlobalData();
  const geo = window.OH_SUP_GEO || {
    districts: { type: "FeatureCollection", features: [] },
    mandals: { type: "FeatureCollection", features: [] },
    villages: {},
    blocks: {}
  };
  return geo;
}

/**
 * Performance indicators list for KPI grid
 */
export function getPerformanceKPIs(summary) {
  const s = summary || {};
  return [
    { label: "Total visits", value: s.total_visits ?? 0, icon: "pin" },
    { label: "Alerts generated", value: s.alerts_generated ?? 0, icon: "alert" },
    { label: "Referrals", value: s.referrals ?? 0, icon: "share" },
    { label: "Pending follow-ups", value: s.referrals_followup ?? 0, icon: "clock" },
    { label: "Awareness activities", value: s.awareness ?? 0, icon: "megaphone" },
    { label: "Trainings imparted", value: s.trainings_imparted ?? 0, icon: "grad" },
    { label: "Trainings attended", value: s.trainings_attended ?? 0, icon: "book" },
    { label: "Meetings", value: s.meetings ?? 0, icon: "sync" }
  ];
}

/**
 * Download volunteer performance data as CSV
 */
export function exportVolunteersCSV(volunteers, activeMetrics, filename = "cohv-volunteer-performance.csv") {
  const metrics = activeMetrics || METRICS;
  const headers = ["Volunteer Name", "Designation", "Village", "Block", "District", "Pillar", ...metrics.map((m) => m.l), "Total"];

  const rows = volunteers.map((v) => {
    const act = v.activity || {};
    const metricVals = metrics.map((m) => act[m.k] || 0);
    const total = metricVals.reduce((a, b) => a + b, 0);
    return [
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${(v.designation || "").replace(/"/g, '""')}"`,
      `"${(v.village || "").replace(/"/g, '""')}"`,
      `"${(v.block || "").replace(/"/g, '""')}"`,
      `"${(v.district || "").replace(/"/g, '""')}"`,
      `"${(v.pillarLabel || "").replace(/"/g, '""')}"`,
      ...metricVals,
      total
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
