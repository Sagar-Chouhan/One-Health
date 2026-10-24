import React from "react";
import { ShellTop, ShellBottom } from "../../../shell/Shell.jsx";
import { useReports } from "../hooks/useReports.js";
import SupervisorBanner from "../components/SupervisorBanner.jsx";
import ReportTabs from "../components/ReportTabs.jsx";
import ConsolidatedReportsTab from "../components/ConsolidatedReportsTab.jsx";
import ReferralsTab from "../components/ReferralsTab.jsx";
import DataQualityTab from "../components/DataQualityTab.jsx";
import "../report.css";

export default function ReportPage() {
  const {
    session,
    summary,
    activeTab,
    setActiveTab,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    dateSummary,
    handleSearch,
    handleReset,
    referrals,
    handleMarkDone,
    dataQualityItems,
    handleReturnForCorrection,
    handleAcceptAnyway,
    handleExportPdf,
    handleExportExcel,
  } = useReports();

  return (
    <>
      <ShellTop mode="supervisor" active="sup-reports" />

      <main id="main" className="rep-page">
        <SupervisorBanner session={session} summary={summary} />

        <div className="wrap">
          <ReportTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "consolidated" && (
            <ConsolidatedReportsTab
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
              dateSummary={dateSummary}
              onSearch={handleSearch}
              onReset={handleReset}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
            />
          )}

          {activeTab === "referrals" && (
            <ReferralsTab
              referrals={referrals}
              onMarkDone={handleMarkDone}
            />
          )}

          {activeTab === "data-quality" && (
            <DataQualityTab
              items={dataQualityItems}
              onReturnForCorrection={handleReturnForCorrection}
              onAcceptAnyway={handleAcceptAnyway}
            />
          )}
        </div>
      </main>

      <ShellBottom mode="supervisor" />
    </>
  );
}
