import React from "react";
import { getPerformanceKPIs } from "../service.js";
import { Icon } from "../../../../lib/icons.jsx";

export default function PerformanceKPIs({ summary }) {
  const kpis = getPerformanceKPIs(summary);

  return (
    <div className="sup-kpi-grid" role="region" aria-label="Performance indicators and KPIs">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="sup-kpi-card">
          <div className="kpi-hdr">
            <Icon name={kpi.icon || "pin"} className="kpi-ico" />
            <span className="kpi-lbl">{kpi.label}</span>
          </div>
          <div className="kpi-val">{Number(kpi.value || 0).toLocaleString("en-IN")}</div>
        </div>
      ))}
    </div>
  );
}
