import React from "react";
import { Link } from "react-router-dom";

export default function AtAGlanceTiles({ summary, teamCount }) {
  const s = summary || {};
  const supervisedCount = teamCount ?? (s.team_total || 5);

  const tiles = [
    {
      l: "COHVs supervised",
      v: supervisedCount,
      warn: false
    },
    {
      l: "Awaiting verification",
      v: s.awaiting_verification ?? 4,
      warn: (s.awaiting_verification ?? 4) > 0,
      link: "/supervisor-approvals?seg=verify",
      cta: "Verify now →"
    },
    {
      l: "Open alerts",
      v: s.open_alerts ?? 2,
      warn: (s.open_alerts ?? 2) > 0,
      link: "/supervisor-approvals?seg=alerts",
      cta: "Escalate →"
    },
    {
      l: "Pending COHV approvals",
      v: s.pending_approvals ?? 1,
      warn: (s.pending_approvals ?? 1) > 0,
      link: "/supervisor-approvals?seg=regs",
      cta: "Approve →"
    },
    {
      l: "Referrals to follow up",
      v: s.referrals_followup ?? 3,
      warn: (s.referrals_followup ?? 3) > 0,
      link: "/supervisor-reports?tab=referrals",
      cta: "Track →"
    }
  ];

  return (
    <div className="sup-glance" id="glance" role="region" aria-label="At a glance metrics">
      {tiles.map((t, idx) => {
        const isWarn = t.warn && t.v > 0;
        const cls = `sup-tile${isWarn ? " warn" : ""}${t.link ? " link" : ""}`;
        const inner = (
          <>
            <div className="l">{t.l}</div>
            <div className="v">{Number(t.v || 0).toLocaleString("en-IN")}</div>
            {t.cta && <div className="cta">{t.cta}</div>}
          </>
        );

        if (t.link) {
          return (
            <Link key={idx} className={cls} to={t.link}>
              {inner}
            </Link>
          );
        }

        return (
          <div key={idx} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
