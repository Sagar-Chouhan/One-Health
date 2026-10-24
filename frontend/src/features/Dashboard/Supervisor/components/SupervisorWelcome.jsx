import React from "react";

function getInitials(name) {
  if (!name) return "SV";
  const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return "SV";
}

export default function SupervisorWelcome({ profile, teamCount }) {
  const p = profile || {};
  const initials = getInitials(p.name);
  const volunteersCount = teamCount ?? (p.teamIds ? p.teamIds.length : 5);

  return (
    <div className="sup-welcome" id="welcome" role="region" aria-label="Supervisor summary">
      <div className="sup-avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="sup-who">
        <div className="sup-nm">{p.name || "Supervisor"} · {p.title || "APM"}</div>
        <div className="sup-sub">
          {p.pillarLabel || "Environment"} · {volunteersCount} volunteer{volunteersCount === 1 ? "" : "s"} supervised
        </div>
        <div className="sup-scope">
          {p.block} · {p.district} · {p.state}
        </div>
      </div>

      <div className="sup-dept-badge">
        <span className="dot" aria-hidden="true" />
        <span>{p.pillarLabel || "Environment"} Department</span>
      </div>

      <div className="sup-filter-note">
        Live data: <b>Active COHV Reporting Scope</b>
      </div>
    </div>
  );
}
