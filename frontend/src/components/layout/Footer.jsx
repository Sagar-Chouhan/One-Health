import { useToast } from "../../shell/ToastContext.jsx";

export default function Footer({ mode }) {
  const toast = useToast();
  const links = ["Website Policies", "Accessibility Statement", "Help", "Contact Us", "Feedback"];
  const isLogin = mode === "login";

  return (
    <>
      {!isLogin && (
        <section className="partners" aria-label="In coordination with">
          <div className="wrap">
            <span>In coordination with</span>
            <img src="/assets/img/nohm.png" alt="National One Health Mission" />
            <img className="sm" src="/assets/img/ncdc.png" alt="National Centre for Disease Control" />
          </div>
        </section>
      )}
      <div className="nav-line foot-nav-line" aria-hidden="true" />
      <footer className="foot">
        <div className="wrap foot-main">
          <div className="foot-brand">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="22" cy="24" r="14" fill="#b85c78" opacity="0.9" />
              <circle cx="42" cy="24" r="14" fill="#f97316" opacity="0.9" />
              <circle cx="32" cy="42" r="14" fill="#22c55e" opacity="0.9" />
            </svg>
            <b>ONE HEALTH</b>
            <small>Integrated Surveillance Portal · India</small>
          </div>
          <nav aria-label="Footer">
            {links.map((link) => (
              <a key={link} href="#" onClick={(event) => { event.preventDefault(); toast(`${link} — preview only`); }}>{link}</a>
            ))}
          </nav>
        </div>
        <div className="foot-base">
          <div className="wrap">
            <p>Content owned by National Centre for Disease Control, Ministry of Health and Family Welfare, Government of India.</p>
            <p>For authorised government users only.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
