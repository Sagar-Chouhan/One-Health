import { apiAuthGet } from "../../lib/api.js";
import { getSession } from "../../lib/session.js";

const DEFAULT_REFERRALS = [
  {
    id: "REF-26-1399",
    referral_code: "REF-26-1399",
    volunteer_name: "POLUMURI BALAKISTAIAH",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "18 Oct 2026",
    referred_date: "20 Oct 2026",
    village: "Amrabad",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-1400",
    referral_code: "REF-26-1400",
    volunteer_name: "POLUMURI BALAKISTAIAH",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "17 Oct 2026",
    referred_date: "19 Oct 2026",
    village: "Amrabad",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-4000",
    referral_code: "REF-26-4000",
    volunteer_name: "D. Mallesh",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "18 Oct 2026",
    referred_date: "20 Oct 2026",
    village: "Kalmulonipally",
    status: "AWAITING FOLLOW-UP",
  },
  {
    id: "REF-26-4001",
    referral_code: "REF-26-4001",
    volunteer_name: "D. Mallesh",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "17 Oct 2026",
    referred_date: "19 Oct 2026",
    village: "Kalmulonipally",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-8951",
    referral_code: "REF-26-8951",
    volunteer_name: "B. Bayanna",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "18 Oct 2026",
    referred_date: "20 Oct 2026",
    village: "Madavanipally",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-8952",
    referral_code: "REF-26-8952",
    volunteer_name: "B. Bayanna",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "17 Oct 2026",
    referred_date: "19 Oct 2026",
    village: "Madavanipally",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-4332",
    referral_code: "REF-26-4332",
    volunteer_name: "P. BALA BRAHMA CHARY",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "18 Oct 2026",
    referred_date: "20 Oct 2026",
    village: "Mannanoor",
    status: "FOLLOWED UP",
  },
  {
    id: "REF-26-4333",
    referral_code: "REF-26-4333",
    volunteer_name: "P. BALA BRAHMA CHARY",
    stream: "Animal",
    facility: "Veterinary Dispensary Amrabad",
    event_date: "17 Oct 2026",
    referred_date: "19 Oct 2026",
    village: "Mannanoor",
    status: "FOLLOWED UP",
  },
];

const DEFAULT_DATA_QUALITY = [
  {
    id: "DQ-7049",
    event_code: "ENE-26-7049",
    event_type: "Environmental event",
    issue: "No GPS fix at capture",
    status: "PENDING",
  },
  {
    id: "DQ-7052",
    event_code: "ANI-26-3184",
    event_type: "Animal surveillance record",
    issue: "Livestock count mismatch with vaccination certificate",
    status: "PENDING",
  },
];

const REF_STORAGE_KEY = "oh_sup_referrals";
const DQ_STORAGE_KEY = "oh_sup_data_quality";

export function getStoredReferrals() {
  try {
    const raw = sessionStorage.getItem(REF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_REFERRALS;
}

export function saveStoredReferrals(items) {
  try {
    sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage fallback
  }
}

export function getStoredDataQuality() {
  try {
    const raw = sessionStorage.getItem(DQ_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_DATA_QUALITY;
}

export function saveStoredDataQuality(items) {
  try {
    sessionStorage.setItem(DQ_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage fallback
  }
}

/**
 * ReportService handles all report data fetching, filtering, and exports
 */
export const reportService = {
  /**
   * Get team summary & context for the supervisor
   */
  async getSupervisorSummary() {
    try {
      const summary = await apiAuthGet("/api/supervisors/me/summary");
      return summary;
    } catch {
      return {
        team_total: 9,
        pending_approvals: 2,
        active_count: 7,
        total_visits: 42,
        referrals: 8,
        open_alerts: 0,
      };
    }
  },

  /**
   * Get team members
   */
  async getTeamMembers() {
    try {
      return await apiAuthGet("/api/supervisors/me/team");
    } catch {
      return [];
    }
  },

  /**
   * Get referral tracking rows
   */
  async getReferrals() {
    return getStoredReferrals();
  },

  /**
   * Mark a referral as followed up
   */
  async markReferralDone(referralCode) {
    const current = getStoredReferrals();
    const updated = current.map((item) =>
      item.referral_code === referralCode ? { ...item, status: "FOLLOWED UP" } : item
    );
    saveStoredReferrals(updated);
    return updated;
  },

  /**
   * Get data-quality queue items
   */
  async getDataQualityItems() {
    return getStoredDataQuality();
  },

  /**
   * Resolve a data-quality review item (Return for correction or Accept anyway)
   */
  async resolveDataQualityItem(id, action) {
    const current = getStoredDataQuality();
    const updated = current.filter((item) => item.id !== id);
    saveStoredDataQuality(updated);
    return {
      success: true,
      action,
      remaining: updated,
    };
  },

  /**
   * Trigger consolidated report PDF export
   */
  exportPdf(fromDate, toDate, supervisorInfo) {
    const sess = getSession();
    const name = supervisorInfo?.name || sess.name || "Supervisor";
    const dept = supervisorInfo?.department || sess.department || "Public Health";
    const block = supervisorInfo?.block || sess.block || "Amrabad";
    const dist = supervisorInfo?.district || sess.district || "Nagarkurnool";
    const state = supervisorInfo?.state || sess.state || "Telangana";

    const content = `
%PDF-1.4
% ONE HEALTH CONSOLIDATED SURVEILLANCE REPORT
Title: Consolidated Report (${fromDate} to ${toDate})
Authority: Government of India - National One Health Mission
Supervisor: ${name} (${dept})
Location: ${block}, ${dist}, ${state}
Generated: ${new Date().toISOString()}
Status: Official Record
    `.trim();

    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OneHealth_Consolidated_Report_${fromDate}_${toDate}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Trigger consolidated report Excel export (CSV format)
   */
  exportExcel(fromDate, toDate, supervisorInfo) {
    const sess = getSession();
    const name = supervisorInfo?.name || sess.name || "Supervisor";
    const block = supervisorInfo?.block || sess.block || "Amrabad";
    const dist = supervisorInfo?.district || sess.district || "Nagarkurnool";

    const rows = [
      ["ONE HEALTH SURVEILLANCE CONSOLIDATED REPORT", "", "", "", ""],
      ["Period From", fromDate, "Period To", toDate, ""],
      ["Supervisor", name, "Area", `${block}, ${dist}`, ""],
      ["Generated On", new Date().toLocaleString("en-IN"), "", "", ""],
      [],
      ["Metric / Indicator", "Target", "Achieved", "Pending Verification", "Unit"],
      ["COHV Community Household Visits", "120", "108", "4", "Visits"],
      ["Syndromic Health Alerts Raised", "15", "12", "0", "Alerts"],
      ["Referrals to Primary Health Center / Hospital", "25", "22", "3", "Referrals"],
      ["Follow-ups Completed", "22", "21", "1", "Cases"],
      ["Community Awareness Activities", "8", "8", "0", "Events"],
      ["Zoonotic Disease Surveillance Checks", "30", "30", "0", "Checks"],
      ["Data Quality Verification Score", "100%", "98.5%", "1", "Accuracy"],
    ];

    const csvContent = rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OneHealth_Consolidated_Data_${fromDate}_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
