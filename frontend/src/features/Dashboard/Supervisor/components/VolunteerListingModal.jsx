import React, { useState } from "react";
import { METRICS } from "../service.js";

const PAGE_SIZE = 10;

export default function VolunteerListingModal({
  isOpen,
  onClose,
  volunteers,
  shownMetrics
}) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!isOpen) return null;

  const activeMetrics = METRICS.filter((m) => shownMetrics[m.k]);
  const totalItems = (volunteers || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages - 1);

  const startIdx = page * PAGE_SIZE;
  const currentSlice = (volunteers || []).slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div
      className="vmodal"
      id="vmodal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vm-title"
      onClick={(e) => {
        if (e.target.classList.contains("vmodal")) onClose();
      }}
    >
      <div className="vcard">
        <div className="vhead">
          <b id="vm-title">All Team Volunteers & Performance Breakdown</b>
          <button type="button" className="fbtn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div style={{ overflowX: "auto", flex: 1 }}>
          <table className="tbl vtbl">
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Pillar</th>
                <th>Block</th>
                <th>Village</th>
                {activeMetrics.map((m) => (
                  <th key={m.k} style={{ color: m.c }}>
                    {m.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentSlice.length > 0 ? (
                currentSlice.map((v) => (
                  <tr key={v.id || v.name}>
                    <td>
                      <b>{v.name}</b>
                      {v.designation && (
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {v.designation}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="scope-pill" style={{ padding: "3px 8px", fontSize: "11px" }}>
                        {v.pillarLabel || "General"}
                      </span>
                    </td>
                    <td>{v.block || "—"}</td>
                    <td>{v.village || v.panchayat || "—"}</td>
                    {activeMetrics.map((m) => (
                      <td key={m.k} style={{ fontWeight: 600 }}>
                        {v.activity?.[m.k] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4 + activeMetrics.length} style={{ textAlign: "center", padding: "24px" }}>
                    No volunteer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="vpager">
          <button
            type="button"
            className="fbtn"
            disabled={page === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          >
            ← Previous
          </button>
          <span>
            Page <b>{page + 1}</b> of <b>{totalPages}</b> · {totalItems} volunteers
          </span>
          <button
            type="button"
            className="fbtn"
            disabled={page >= totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
