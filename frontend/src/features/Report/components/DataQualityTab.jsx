import React from "react";

export default function DataQualityTab({
  items,
  onReturnForCorrection,
  onAcceptAnyway,
}) {
  return (
    <section className="rep-tab-panel" aria-label="Data-quality review">
      <h2 className="rep-section-title">Data-quality review</h2>

      <div className="rep-dq-list">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="card rep-dq-card">
              <div className="rep-dq-left">
                <div className="rep-dq-header">
                  <b>{item.event_type}</b> · {item.event_code}
                </div>
                <div className="rep-dq-issue">{item.issue}</div>
              </div>

              <div className="rep-dq-actions">
                <button
                  type="button"
                  className="rep-btn-outline"
                  onClick={() => onReturnForCorrection(item.id, item.event_code)}
                >
                  Return for correction
                </button>
                <button
                  type="button"
                  className="rep-btn-outline"
                  onClick={() => onAcceptAnyway(item.id, item.event_code)}
                >
                  Accept anyway
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card rep-dq-empty">
            <p>All records verified. No data-quality flags currently pending.</p>
          </div>
        )}
      </div>
    </section>
  );
}
