import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../../lib/api.js";
import { Icon } from "../../lib/icons.jsx";
import { clearSession, getSession, setSession } from "../../lib/session.js";
import { ShellBottom, ShellTop } from "../../shell/Shell.jsx";
import { useToast } from "../../shell/ToastContext.jsx";
import "./login.css";

const ROLES = [
  { id: "super", icon: "shield", label: "NOHM / NCDC", name: "NOHM / NCDC" },
  { id: "ministry", icon: "landmark", label: "Department", name: "Department" },
  { id: "state", icon: "map", label: "State Nodal", name: "State Nodal Officer" },
  { id: "district", icon: "pin", label: "District Nodal", name: "District Nodal Officer" },
  { id: "block", icon: "home", label: "Block Nodal", name: "Block Nodal Officer" },
  { id: "supervisor", icon: "users", label: "COHV Supervisor", name: "COHV Supervisor" },
];

const ROLE_NAMES = Object.fromEntries(ROLES.map(({ id, name }) => [id, name]));

const MINISTRIES = [
  ["mohfw", "Ministry of Health and Family Welfare"],
  ["dahd", "Department of Animal Husbandry & Dairying"],
  ["forest", "Ministry of Environment, Forest and Climate Change"],
  ["imd", "India Meteorological Department"],
  ["icar", "Indian Council of Agricultural Research"],
  ["municipal", "Municipal Corporation"],
  ["fssai", "Food Safety and Standards Authority of India"],
  ["pcb", "Pollution Control Board"],
];

const DEMO_ACCOUNTS = {
  "admin@onehealth.in": { password: "nohm@oh2026", role: "super" },
  "mohfw@onehealth.in": { password: "mohfw@oh2026", role: "ministry", ministry: "mohfw" },
  "dahd@onehealth.in": { password: "dahd@oh2026", role: "ministry", ministry: "dahd" },
  "forest@onehealth.in": { password: "forest@oh2026", role: "ministry", ministry: "forest" },
};

function RoleSelector({ selectedRole, onChange }) {
  return (
    <div className="roles" role="radiogroup" aria-label="Access level">
      {ROLES.map((role) => (
        <button
          key={role.id}
          type="button"
          className="role"
          role="radio"
          aria-checked={selectedRole === role.id}
          tabIndex={selectedRole === role.id ? 0 : -1}
          onClick={() => onChange(role.id)}
        >
          <Icon name={role.icon} />
          {role.label}
        </button>
      ))}
    </div>
  );
}

function MinistrySelector({ ministry, onChange }) {
  return (
    <div className="field reveal">
      <label htmlFor="ministry">Your department</label>
      <div className="ctl">
        <Icon name="building" className="lead" />
        <select id="ministry" className="input" value={ministry} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select your department</option>
          {MINISTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </div>
  );
}

function SupervisorPosting({ location, options, onState, onDistrict, onBlock, onPerson }) {
  const { stateCode, districtCode, blockCode, person } = location;
  const { states, districts, blocks, supervisors } = options;

  return (
    <div className="field reveal">
      <label htmlFor="supervisor">Your posting</label>
      <div className="supgrid">
        <select className="input" aria-label="State" value={stateCode} onChange={(event) => onState(event.target.value)}>
          <option value="">State</option>
          {states.map((state) => <option key={state.state_lgd_code} value={state.state_lgd_code}>{state.state_name}</option>)}
        </select>
        <select className="input" aria-label="District" value={districtCode} disabled={!stateCode} onChange={(event) => onDistrict(event.target.value)}>
          <option value="">District</option>
          {districts.map((district) => <option key={district.district_lgd_code} value={district.district_lgd_code}>{district.district_name}</option>)}
        </select>
        <select className="input" aria-label="Block or Mandal" value={blockCode} disabled={!districtCode} onChange={(event) => onBlock(event.target.value)}>
          <option value="">Block / Mandal</option>
          {blocks.map((block) => <option key={block.block_lgd_code} value={block.block_lgd_code}>{block.block_name}</option>)}
        </select>
      </div>
      <div className="ctl">
        <Icon name="user" className="lead" />
        <select id="supervisor" className="input" value={person} disabled={!blockCode} onChange={(event) => onPerson(event.target.value)}>
          {!blockCode && <option value="">Choose state, district and block first</option>}
          {blockCode && !supervisors.length && <option value="">No supervisors in this block</option>}
          {blockCode && supervisors.length > 0 && <>
            <option value="">Select supervisor</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.supervisor_id} value={supervisor.supervisor_id}>
                {supervisor.supervisor_name}{supervisor.designation ? ` · ${supervisor.designation}` : ""}{supervisor.cohv_type ? ` · ${supervisor.cohv_type}` : ""}
              </option>
            ))}
          </>}
        </select>
      </div>
    </div>
  );
}

function CredentialsFields({ role, email, password, showPassword, onEmailChange, onPasswordChange, onTogglePassword }) {
  return <>
    <div className="field">
      <label htmlFor="email">{role === "supervisor" ? "E-mail" : "Login ID"}</label>
      <div className="ctl">
        <Icon name="mail" className="lead" />
        <input
          id="email"
          name="email"
          className="input"
          type="text"
          placeholder={role === "supervisor" ? "name@onehealth.in" : "admin@onehealth.in"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          value={email}
          onChange={onEmailChange}
        />
      </div>
    </div>
    <div className="field">
      <label htmlFor="password">Password</label>
      <div className="ctl pw">
        <Icon name="lock" className="lead" />
        <input
          id="password"
          name="password"
          className="input"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          autoComplete="new-password"
          value={password}
          onChange={onPasswordChange}
        />
        <button type="button" className="eye" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={onTogglePassword}>
          <Icon name={showPassword ? "eye-off" : "eye"} />
        </button>
      </div>
      {role === "supervisor" && <p className="help help-start">Demo password: <b>sup@oh2026</b></p>}
    </div>
  </>;
}

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState("super");
  const [ministry, setMinistry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [location, setLocation] = useState({ stateCode: "", districtCode: "", blockCode: "", person: "" });

  const resetCredentials = () => { setEmail(""); setPassword(""); setError(""); };

  useEffect(() => {
    const session = getSession();
    if (session?.role === "supervisor" && session?.supId) {
      navigate("/supervisor-dashboard", { replace: true });
      return;
    }
    clearSession();
    resetCredentials();
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, [navigate]);

  useEffect(() => {
    resetCredentials();
  }, [role, ministry]);

  useEffect(() => {
    if (role === "supervisor") {
      apiGet("/api/locations/states")
        .then((sts) => {
          setStates(sts);
          const tg = sts.find((s) => s.state_lgd_code === 36 || s.state_name?.toLowerCase().includes("telangana"));
          const tgCode = tg ? tg.state_lgd_code : 36;
          apiGet("/api/locations/districts", { state_lgd_code: tgCode })
            .then((dists) => {
              setDistricts(dists);
              const nk = dists.find((d) => d.district_lgd_code === 694 || d.district_name?.toLowerCase().includes("nagarkurnool"));
              const nkCode = nk ? nk.district_lgd_code : (dists[0]?.district_lgd_code || 694);
              apiGet("/api/locations/blocks", { district_lgd_code: nkCode })
                .then((blks) => {
                  setBlocks(blks);
                  const blk = blks.find((b) => b.block_lgd_code === 5208 || b.block_name?.toLowerCase().includes("amrabad")) || blks[0];
                  const blkCode = blk ? blk.block_lgd_code : 5208;
                  apiGet("/api/supervisors/by-location", { state_lgd_code: tgCode, district_lgd_code: nkCode, block_lgd_code: blkCode })
                    .then((sups) => {
                      setSupervisors(sups);
                      setLocation({ stateCode: tgCode, districtCode: nkCode, blockCode: blkCode, person: "" });
                      resetCredentials();
                    })
                    .catch(console.error);
                })
                .catch(console.error);
            })
            .catch(console.error);
        })
        .catch(console.error);
    }
  }, [role]);

  const selectState = (stateCode) => {
    setLocation({ stateCode, districtCode: "", blockCode: "", person: "" });
    setDistricts([]); setBlocks([]); setSupervisors([]); resetCredentials();
    if (stateCode) apiGet("/api/locations/districts", { state_lgd_code: stateCode }).then(setDistricts).catch((reason) => setError(reason.message));
  };
  const selectDistrict = (districtCode) => {
    setLocation((current) => ({ ...current, districtCode, blockCode: "", person: "" }));
    setBlocks([]); setSupervisors([]); resetCredentials();
    if (districtCode) apiGet("/api/locations/blocks", { district_lgd_code: districtCode }).then(setBlocks).catch((reason) => setError(reason.message));
  };
  const selectBlock = (blockCode) => {
    setLocation((current) => ({ ...current, blockCode, person: "" }));
    setSupervisors([]); resetCredentials();
    if (blockCode) apiGet("/api/supervisors/by-location", { state_lgd_code: location.stateCode, district_lgd_code: location.districtCode, block_lgd_code: blockCode }).then(setSupervisors).catch((reason) => setError(reason.message));
  };
  const selectSupervisor = (person) => {
    const supervisor = supervisors.find((item) => String(item.supervisor_id) === String(person));
    setLocation((current) => ({ ...current, person }));
    setEmail(supervisor?.email || "");
    setPassword("");
    setError("");
  };
  const signInSupervisor = async () => {
    if (!location.stateCode || !location.districtCode || !location.blockCode || !location.person) throw new Error("Please choose your state, district, block and name.");
    if (!email.trim() || !password) throw new Error("Please enter both your e-mail and password.");
    const response = await apiPost("/api/supervisors/login", { email: email.trim(), password });
    const supervisor = response.supervisor;
    const cohvType = supervisor.cohv_type || (supervisor.department_name ? supervisor.department_name.replace(/ Department$/i, "") : "Public Health");
    setSession({
      role: "supervisor",
      roleName: "COHV Supervisor",
      user: supervisor.email,
      supId: supervisor.supervisor_code,
      title: supervisor.designation ? `${supervisor.supervisor_name} · ${supervisor.designation}` : supervisor.supervisor_name,
      name: supervisor.supervisor_name,
      pillarLabel: supervisor.department_name || supervisor.cohv_type || "Public Health Department",
      cohvType: cohvType,
      state: supervisor.state_name,
      district: supervisor.district_name,
      block: supervisor.block_name,
      token: response.access_token,
      expiresIn: response.expires_in,
    });
    navigate("/supervisor-dashboard");
  };
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (role === "supervisor") { await signInSupervisor(); return; }
      const account = DEMO_ACCOUNTS[email.trim().toLowerCase()];
      if (!email.trim() || !password) throw new Error("Please enter both your login ID and password.");
      if (!account || account.password !== password) throw new Error("The login ID or password is incorrect.");
      if (account.role !== role) throw new Error(`This account belongs to ${ROLE_NAMES[account.role]}. Please choose that access level above.`);
      if (role === "ministry" && (!ministry || ministry !== account.ministry)) throw new Error(ministry ? "The selected department does not match this account." : "Please select your department.");
      window.setTimeout(() => { setBusy(false); toast(`${ROLE_NAMES[role]} dashboard is not part of this build yet.`); }, 600);
    } catch (reason) { setBusy(false); setError(reason.detail || reason.message || "Sign in failed."); }
  };

  return (
    <>
      <ShellTop mode="login" />
      <main className="login" id="main">
        <aside className="photo-side" aria-label="About One Health">
          <img className="bg" src="/assets/img/india-milking.jpg" alt="" />
        </aside>
        <section className="form-side">
          <div className="form-wrap">
            <h2>Sign in</h2>
            <p className="sub">Choose your access level to continue.</p>
            <RoleSelector selectedRole={role} onChange={setRole} />
            <form onSubmit={submit} noValidate autoComplete="off">
              {role === "ministry" && <MinistrySelector ministry={ministry} onChange={setMinistry} />}
              {role === "supervisor" && (
                <SupervisorPosting
                  location={location}
                  options={{ states, districts, blocks, supervisors }}
                  onState={selectState}
                  onDistrict={selectDistrict}
                  onBlock={selectBlock}
                  onPerson={selectSupervisor}
                />
              )}
              <CredentialsFields
                role={role}
                email={email}
                password={password}
                showPassword={showPassword}
                onEmailChange={(event) => { setEmail(event.target.value); setError(""); }}
                onPasswordChange={(event) => { setPassword(event.target.value); setError(""); }}
                onTogglePassword={() => setShowPassword((current) => !current)}
              />
              <div className="row">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    toast("Password reset is not available in this preview.");
                  }}
                >
                  Forgot password?
                </a>
              </div>
              {error && (
                <div className="error" role="alert">
                  <Icon name="alert" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className="signin-btn" aria-busy={busy}>
                {busy ? (
                  <>
                    <span className="spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <span>Sign in as {ROLE_NAMES[role]}</span>
                    <Icon name="arrow" />
                  </>
                )}
              </button>
            </form>
            <p className="help">
              Not a registered user?{" "}
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  toast("Public portal is not part of this build.");
                }}
              >
                Back to public portal
              </a>
            </p>
          </div>
        </section>
      </main>
      <ShellBottom mode="login" />
    </>
  );
}
