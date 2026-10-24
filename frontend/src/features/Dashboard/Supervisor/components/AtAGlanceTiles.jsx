import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../../lib/icons.jsx";

export default function AtAGlanceTiles({ summary, teamCount }) {
  const s = summary || {};
  const supervisedCount = teamCount ?? (s.team_total || 9);

  return (
    <div className="sup-glance-grid" role="region" aria-label="At a glance metrics">
      {/* 1. COHVs supervised (Dark navy card) */}
      <div className="sup-glance-card dark">
        <div className="card-top">
          <div className="card-hdr">
            <Icon name="users" className="card-ico" />
            <span>COHVs supervised</span>
          </div>
          <Icon name="info" className="info-ico" />
        </div>
        <div className="card-val">{supervisedCount}</div>
        <div className="card-sub">In your team</div>
      </div>

      {/* 2. Awaiting verification */}
      <div className="sup-glance-card">
        <div className="card-top">
          <div className="card-hdr">
            <Icon name="clock" className="card-ico" />
            <span>Awaiting verification</span>
          </div>
          <Icon name="info" className="info-ico" />
        </div>
        <div className="card-val">{s.awaiting_verification ?? 0}</div>
        <div className="card-sub">Records to verify</div>
      </div>

      {/* 3. Open alerts */}
      <div className="sup-glance-card">
        <div className="card-top">
          <div className="card-hdr">
            <Icon name="siren" className="card-ico" />
            <span>Open alerts</span>
          </div>
          <Icon name="info" className="info-ico" />
        </div>
        <div className="card-val">{s.open_alerts ?? 0}</div>
        <div className="card-sub">Need escalation</div>
      </div>

      {/* 4. Pending COHV approvals */}
      <div className="sup-glance-card">
        <div className="card-top">
          <div className="card-hdr">
            <Icon name="shield-check" className="card-ico" />
            <span>Pending COHV approvals</span>
          </div>
          <Icon name="info" className="info-ico" />
        </div>
        <div className="card-val">{s.pending_approvals ?? 1}</div>
        <div className="card-sub">New volunteers</div>
        <Link to="/supervisor-approvals?seg=regs" className="card-link">
          Open →
        </Link>
      </div>

      {/* 5. Referrals to follow up */}
      <div className="sup-glance-card">
        <div className="card-top">
          <div className="card-hdr">
            <Icon name="share" className="card-ico" />
            <span>Referrals to follow up</span>
          </div>
          <Icon name="info" className="info-ico" />
        </div>
        <div className="card-val">{s.referrals_followup ?? 0}</div>
        <div className="card-sub">Awaiting follow-up</div>
      </div>
    </div>
  );
}
