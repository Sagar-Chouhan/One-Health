import React from "react";
import { Link } from "react-router-dom";

export default function ApprovalsReportsJump() {
  return (
    <section id="sec-jump" className="sup-view" aria-label="Approvals and Reports Quick Jump">
      <div className="sup-view-h">
        <h2>Approvals &amp; Reports</h2>
        <span className="sub">Direct access to verification queues and program reporting</span>
      </div>

      <div className="quick-jump">
        <Link className="qj" to="/supervisor-approvals">
          <span className="ico" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12l2 2 4-4" />
              <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
          </span>
          <div className="txt">
            <div className="h">Approvals</div>
            <div className="p">COHV registrations · Alert escalations · Report verifications</div>
          </div>
          <span className="chev" aria-hidden="true">›</span>
        </Link>

        <Link className="qj" to="/supervisor-reports">
          <span className="ico" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 7h8M8 11h8M8 15h5" />
            </svg>
          </span>
          <div className="txt">
            <div className="h">Reports</div>
            <div className="p">Monthly / Quarterly / Annual · Referrals · Data quality · Export</div>
          </div>
          <span className="chev" aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
  );
}
