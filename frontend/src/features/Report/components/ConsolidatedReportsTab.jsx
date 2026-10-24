import React from "react";
import ExportCard from "./ExportCard.jsx";

export default function ConsolidatedReportsTab({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  dateSummary,
  onSearch,
  onReset,
  onExportPdf,
  onExportExcel,
}) {
  return (
    <section className="rep-tab-panel" aria-label="Consolidated reports">
      <h2 className="rep-section-title">Consolidated reports</h2>

      {/* Date Filter Bar */}
      <div className="rep-filter-bar">
        <div className="rep-filter-inputs">
          <div className="rep-date-field">
            <label htmlFor="rep-from">From</label>
            <div className="rep-input-wrap">
              <input
                id="rep-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rep-date-input"
              />
            </div>
          </div>

          <div className="rep-date-field">
            <label htmlFor="rep-to">To</label>
            <div className="rep-input-wrap">
              <input
                id="rep-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rep-date-input"
              />
            </div>
          </div>

          <button type="button" className="rep-btn rep-btn-search" onClick={onSearch}>
            Search
          </button>

          <button type="button" className="rep-btn rep-btn-reset" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="rep-date-summary" role="status">
          {dateSummary}
        </div>
      </div>

      {/* Large Export Cards */}
      <div className="rep-exports-grid">
        <ExportCard type="pdf" title="Export PDF" onExport={onExportPdf} />
        <ExportCard type="excel" title="Export Excel" onExport={onExportExcel} />
      </div>
    </section>
  );
}
