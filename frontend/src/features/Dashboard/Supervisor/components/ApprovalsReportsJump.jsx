import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../../lib/icons.jsx";

export default function ApprovalsReportsJump() {
  return (
    <div className="sup-jump-grid" role="region" aria-label="Approvals and Reports Quick Jump">
      <Link className="sup-jump-card" to="/supervisor-approvals">
        <div className="jump-l">
          <div className="jump-ico-box">
            <Icon name="clipboard" className="jump-ico" />
          </div>
          <div className="jump-txt">
            <div className="jump-title">Approvals</div>
            <div className="jump-sub">
              COHV registrations · Alert escalations · Record verification
            </div>
          </div>
        </div>
        <span className="jump-arrow" aria-hidden="true">→</span>
      </Link>

      <Link className="sup-jump-card" to="/supervisor-reports">
        <div className="jump-l">
          <div className="jump-ico-box">
            <Icon name="file" className="jump-ico" />
          </div>
          <div className="jump-txt">
            <div className="jump-title">Reports</div>
            <div className="jump-sub">
              Monthly / Quarterly / Annual · Referrals · Data quality · Export
            </div>
          </div>
        </div>
        <span className="jump-arrow" aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
