import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../../shell/ToastContext.jsx";
import { getSession } from "../../../lib/session.js";
import { reportService } from "../report.service.js";

const DEFAULT_FROM = "2026-09-24";
const DEFAULT_TO = "2026-10-24";
const VALID_TABS = ["consolidated", "referrals", "data-quality"];

function formatDateLabel(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function useReports() {
  const toast = useToast();
  const session = getSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get("tab");
  const initialTab = urlTab && VALID_TABS.includes(urlTab) ? urlTab : "consolidated";

  const [activeTab, setActiveTabState] = useState(initialTab);
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [summary, setSummary] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [dataQualityItems, setDataQualityItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.includes(t)) {
      setActiveTabState(t);
    }
  }, [searchParams]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, refs, dq] = await Promise.all([
        reportService.getSupervisorSummary(),
        reportService.getReferrals(),
        reportService.getDataQualityItems(),
      ]);
      setSummary(sum);
      setReferrals(refs);
      setDataQualityItems(dq);
    } catch (err) {
      toast(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute formatted range summary e.g. "24 Sept 2026 – 24 Oct 2026 · 31 days"
  const dateSummary = useMemo(() => {
    if (!fromDate || !toDate) return "";
    const fromLabel = formatDateLabel(fromDate);
    const toLabel = formatDateLabel(toDate);
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${fromLabel} – ${toLabel} · ${diffDays} days`;
  }, [fromDate, toDate]);

  // Actions
  const handleSearch = () => {
    toast(`Filters applied for period ${fromDate} to ${toDate}`);
  };

  const handleReset = () => {
    setFromDate(DEFAULT_FROM);
    setToDate(DEFAULT_TO);
    toast("Filters reset to default 30-day period");
  };

  const handleMarkDone = async (referralCode) => {
    try {
      const updated = await reportService.markReferralDone(referralCode);
      setReferrals([...updated]);
      toast(`Referral ${referralCode} marked as followed up.`);
    } catch {
      toast("Could not update referral");
    }
  };

  const handleReturnForCorrection = async (id, eventCode) => {
    try {
      const res = await reportService.resolveDataQualityItem(id, "RETURNED");
      setDataQualityItems([...res.remaining]);
      toast(`Event ${eventCode} returned to volunteer for correction.`);
    } catch {
      toast("Action failed");
    }
  };

  const handleAcceptAnyway = async (id, eventCode) => {
    try {
      const res = await reportService.resolveDataQualityItem(id, "ACCEPTED");
      setDataQualityItems([...res.remaining]);
      toast(`Event ${eventCode} accepted.`);
    } catch {
      toast("Action failed");
    }
  };

  const handleExportPdf = () => {
    try {
      reportService.exportPdf(fromDate, toDate, session);
      toast("Consolidated PDF report downloaded successfully.");
    } catch {
      toast("PDF export failed");
    }
  };

  const handleExportExcel = () => {
    try {
      reportService.exportExcel(fromDate, toDate, session);
      toast("Consolidated Excel (CSV) report downloaded successfully.");
    } catch {
      toast("Excel export failed");
    }
  };

  return {
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
    loading,
  };
}
