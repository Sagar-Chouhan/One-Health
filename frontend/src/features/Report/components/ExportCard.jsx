import React from "react";

export default function ExportCard({ type, title, onExport }) {
  const isPdf = type === "pdf";

  return (
    <button
      type="button"
      className={`card rep-export-card ${isPdf ? "pdf-card" : "excel-card"}`}
      onClick={onExport}
      aria-label={title}
    >
      <div className="rep-export-icon-wrap">
        {isPdf ? (
          <div className="rep-doc-icon pdf">
            <svg viewBox="0 0 60 72" className="rep-doc-svg" aria-hidden="true">
              {/* Document shape with folded corner */}
              <path
                d="M6 0h34l16 16v50a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6z"
                fill="#ffffff"
                stroke="#c73e65"
                strokeWidth="3"
              />
              <path d="M40 0v16h16" fill="#fdeef2" stroke="#c73e65" strokeWidth="3" />
              <text
                x="28"
                y="46"
                fill="#c73e65"
                fontSize="15"
                fontWeight="800"
                fontFamily="Inter, sans-serif"
                textAnchor="middle"
              >
                PDF
              </text>
            </svg>
            <span className="rep-download-badge pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 19h16" />
              </svg>
            </span>
          </div>
        ) : (
          <div className="rep-doc-icon excel">
            <svg viewBox="0 0 60 72" className="rep-doc-svg" aria-hidden="true">
              {/* Document shape with folded corner */}
              <path
                d="M6 0h34l16 16v50a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6z"
                fill="#ffffff"
                stroke="#15803d"
                strokeWidth="3"
              />
              <path d="M40 0v16h16" fill="#e7f1eb" stroke="#15803d" strokeWidth="3" />
              <text
                x="28"
                y="46"
                fill="#15803d"
                fontSize="15"
                fontWeight="800"
                fontFamily="Inter, sans-serif"
                textAnchor="middle"
              >
                XLS
              </text>
            </svg>
            <span className="rep-download-badge excel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 19h16" />
              </svg>
            </span>
          </div>
        )}
      </div>

      <div className="rep-export-title">{title}</div>
    </button>
  );
}
