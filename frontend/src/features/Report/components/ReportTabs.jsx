import React from "react";

const TABS = [
  { key: "consolidated", label: "Consolidated reports" },
  { key: "referrals", label: "Referrals & follow-up" },
  { key: "data-quality", label: "Data-quality review" },
];

export default function ReportTabs({ activeTab, onChange }) {
  return (
    <div className="rep-tabs-wrap" role="tablist" aria-label="Report Views">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`rep-pill-tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
