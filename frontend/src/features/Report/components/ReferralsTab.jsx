import React from "react";

export default function ReferralsTab({ referrals, onMarkDone }) {
  return (
    <section className="rep-tab-panel" aria-label="Referral tracking & follow-up">
      <h2 className="rep-section-title">Referral tracking &amp; follow-up</h2>

      <div className="card rep-table-card">
        <div className="rep-table-wrap">
          <table className="rep-table">
            <thead>
              <tr>
                <th>REFERRAL</th>
                <th>VOLUNTEER</th>
                <th>STREAM</th>
                <th>FACILITY</th>
                <th>EVENT → REFERRED</th>
                <th>VILLAGE</th>
                <th>FOLLOW-UP</th>
              </tr>
            </thead>
            <tbody>
              {referrals && referrals.length > 0 ? (
                referrals.map((r) => {
                  const isAwaiting = r.status === "AWAITING FOLLOW-UP";
                  return (
                    <tr key={r.id || r.referral_code}>
                      <td className="rep-cell-code">{r.referral_code}</td>
                      <td className="rep-cell-vol">
                        <b>{r.volunteer_name}</b>
                      </td>
                      <td className="rep-cell-stream">{r.stream}</td>
                      <td className="rep-cell-facility">{r.facility}</td>
                      <td className="rep-cell-dates">
                        {r.event_date} → {r.referred_date}
                      </td>
                      <td className="rep-cell-village">{r.village}</td>
                      <td className="rep-cell-action">
                        <div className="rep-status-group">
                          <span
                            className={`rep-tag ${
                              isAwaiting ? "tag-awaiting" : "tag-followed"
                            }`}
                          >
                            {r.status}
                          </span>
                          {isAwaiting && (
                            <button
                              type="button"
                              className="rep-btn-mark-done"
                              onClick={() => onMarkDone(r.referral_code)}
                            >
                              Mark done
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="rep-empty-cell">
                    No referral records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
