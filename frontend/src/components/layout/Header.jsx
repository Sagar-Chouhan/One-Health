import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../lib/icons.jsx";
import { useToast } from "../../shell/ToastContext.jsx";
import { clearSession, getSession } from "../../lib/session.js";

function GovStrip() {
  const toast = useToast();
  const [fs, setFs] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("oh_fs") || "";
      if (saved) document.documentElement.classList.add(`fs-${saved}`);
      setFs(saved);
    } catch {
      // Local storage is optional.
    }
  }, []);

  const pickSize = (size) => {
    document.documentElement.classList.remove("fs-sm", "fs-lg");
    if (size) document.documentElement.classList.add(`fs-${size}`);
    try {
      localStorage.setItem("oh_fs", size);
    } catch {
      // Local storage is optional.
    }
    setFs(size);
  };

  return (
    <div className="gov">
      <div className="wrap">
        <div className="gov-l">
          <img src="/assets/img/emblem-white.png" alt="" />
          <span className="hi">भारत सरकार</span>
          <span className="sep" aria-hidden="true" />
          <b className="en">Government of India</b>
        </div>
        <div className="gov-r">
          <a className="hide-sm" href="#main">Skip to main content</a>
          <span className="div hide-sm" aria-hidden="true" />
          <span className="fs" role="group" aria-label="Text size">
            <button aria-pressed={fs === "sm"} aria-label="Smaller text" onClick={() => pickSize("sm")}>A-</button>
            <button aria-pressed={fs === ""} aria-label="Normal text" onClick={() => pickSize("")}>A</button>
            <button aria-pressed={fs === "lg"} aria-label="Larger text" onClick={() => pickSize("lg")}>A+</button>
          </span>
          <span className="div fs-div" aria-hidden="true" />
          <span className="lang" role="group" aria-label="Language">
            <button aria-pressed="true">English</button>
            <button className="hi" aria-pressed="false" onClick={() => toast("हिन्दी संस्करण — preview only")}>हिन्दी</button>
          </span>
        </div>
      </div>
    </div>
  );
}

const SUP_TABS = [
  { key: "sup-dashboard", label: "Dashboard", to: "/supervisor-dashboard" },
  { key: "sup-approvals", label: "Approvals", to: "/supervisor-approvals" },
  { key: "sup-reports", label: "Reports", to: "/supervisor-reports" },
  { key: "resources", label: "Resources", to: "/supervisor-resources" },
];

export default function Header({ mode, active }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const login = mode === "login";
  const session = login ? {} : getSession();

  const signOut = () => clearSession();

  return (
    <>
      <GovStrip />
      <header className="mast">
        <div className="wrap">
          {!login && (
            <button className="ibtn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              <Icon name={open ? "x" : "menu"} />
            </button>
          )}
          <div className="mast-logos">
            <Link className="oh" to={login ? "/" : "/supervisor-dashboard"} aria-label="One Health — Home">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="22" cy="24" r="14" fill="#b85c78" opacity="0.85" />
                <circle cx="42" cy="24" r="14" fill="#f97316" opacity="0.85" />
                <circle cx="32" cy="42" r="14" fill="#22c55e" opacity="0.85" />
              </svg>
              <span><b>ONE HEALTH</b><small>Integrated Surveillance Portal · India</small></span>
            </Link>
          </div>
          <div className="mast-r">
            <div className="partners-top">
              <img src="/assets/img/nohm.png" alt="National One Health Mission" />
              <img className="emblem-mast" src="/assets/img/emblem.png" alt="Government of India" />
            </div>
            {login ? (
              <Link className="mast-link" to="/"><Icon name="back" />Public portal</Link>
            ) : (
              <div className="user">
                <span className="avatar" aria-hidden="true">SV</span>
                <div className="who"><b>COHV Supervisor</b><small>{session.title || "Supervisor"}</small></div>
                <Link className="ibtn" to="/" id="logout" aria-label="Sign out" title="Sign out" onClick={signOut}>
                  <Icon name="logout" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      {login ? (
        <div className="nav-line" aria-hidden="true" />
      ) : (
        <nav className={`nav${open ? " open" : ""}`} aria-label="Main">
          <div className="wrap">
            <div className="tabs">
              {SUP_TABS.map((tab) => tab.to ? (
                <Link key={tab.key} to={tab.to} aria-current={tab.key === active ? "page" : undefined}>{tab.label}</Link>
              ) : (
                <a key={tab.key} href="#" onClick={(event) => { event.preventDefault(); toast(`${tab.label} — next screen`); }}>{tab.label}</a>
              ))}
              <a className="m-only" href="#" onClick={(event) => { event.preventDefault(); signOut(); navigate("/"); }}>Sign out</a>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
