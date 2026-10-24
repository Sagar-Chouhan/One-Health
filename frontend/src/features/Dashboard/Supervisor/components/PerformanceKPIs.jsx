import React from "react";
import { getPerformanceKPIs } from "../service.js";

export default function PerformanceKPIs({ summary }) {
  const kpis = getPerformanceKPIs(summary);

  return (
    <section id="sec-performance" className="sup-view" aria-label="Performance indicators and KPIs">
      <div className="sup-view-h">
        <h2>Performance indicators &amp; KPIs</h2>
        <span className="sub">Aggregated indicators for field teams in your block</span>
      </div>

      <div className="kgrid" id="activity-body">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="kcell">
            <div>
              <div className="l">{kpi.label}</div>
              <div className="v">{Number(kpi.value || 0).toLocaleString("en-IN")}</div>
            </div>
            {kpi.sub && <div className="delta">{kpi.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
