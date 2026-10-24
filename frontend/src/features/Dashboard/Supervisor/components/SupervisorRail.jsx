import React, { useEffect, useState } from "react";

const NAV_ITEMS = [
  { id: "sec-overview", label: "Overview", icon: "📊" },
  { id: "sec-map", label: "Data Map", icon: "🗺️" },
  { id: "sec-performance", label: "Performance & KPIs", icon: "📈" },
  { id: "sec-jump", label: "Approvals & Reports", icon: "⚡" }
];

export default function SupervisorRail() {
  const [activeSection, setActiveSection] = useState("sec-overview");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  return (
    <aside className="sup-rail" id="sup-rail" aria-label="Dashboard sections">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={activeSection === item.id ? "active" : ""}
          onClick={(e) => scrollTo(e, item.id)}
        >
          <span className="rail-ico" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </aside>
  );
}
