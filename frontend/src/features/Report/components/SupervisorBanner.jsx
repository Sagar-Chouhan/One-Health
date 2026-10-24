import React from "react";

function getInitials(name, designation) {
  if (name) {
    const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  if (designation) {
    const parts = designation.split(/\s+/);
    return parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  return "SV";
}

export default function SupervisorBanner({ session, summary }) {
  const s = session || {};
  const designation = s.title || "Assistant Program Manager (APM)";
  const dept = s.cohvType || s.department || "Public Health";
  const block = s.block || "Amrabad";
  const district = s.district || "Nagarkurnool";
  const state = s.state || "Telangana";
  const teamTotal = summary?.team_total ?? 9;

  const initials = getInitials(s.name, designation);

  return (
    <div className="rep-banner-wrap">
      {/* Top security yellow ribbon matching screenshot */}
      <div className="rep-sec-strip">
        <span className="rep-lock-icon" aria-hidden="true">🔒</span>
        <span>
          <b>COHV Supervisor:</b> {dept} · {designation} — {block} · {district} · {state}
        </span>
      </div>

      {/* Profile Card */}
      <div className="card rep-profile-card">
        <div className="rep-profile-left">
          <div className="rep-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="rep-info">
            <h1 className="rep-title">
              COHV Supervisor · {designation}
            </h1>
            <div className="rep-sub1">
              {dept} · {teamTotal} volunteer{teamTotal === 1 ? "" : "s"}
            </div>
            <div className="rep-sub2">
              {block} · {district} · {state}
            </div>
          </div>
        </div>

        <div className="rep-profile-right">
          <span className="rep-dept-pill">
            <span className="rep-dot" aria-hidden="true">●</span> {dept} department
          </span>
        </div>
      </div>
    </div>
  );
}
