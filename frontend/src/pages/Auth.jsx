import React, { useState } from "react";
import Icon from "../components/Icon";
import { login, signup } from "../services/api";
import { saveAuthSession } from "../utils/auth";

function NetworkVisual() {
  return (
    <div className="auth-network">
      <svg viewBox="0 0 620 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="authFlow1" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#4cd7f6" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity=".2" />
          </linearGradient>
          <linearGradient id="authFlow2" x1="100%" x2="0%">
            <stop offset="0%" stopColor="#c3c0ff" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity=".15" />
          </linearGradient>
        </defs>
        <path d="M45 210 C145 65 220 120 310 210 C400 300 470 70 575 180" stroke="url(#authFlow1)" />
        <path d="M45 260 C160 380 225 300 310 210 C400 120 480 355 575 245" stroke="url(#authFlow2)" />
        <path d="M95 105 C200 165 220 270 310 210 C400 150 430 260 525 320" className="auth-secondary-line" />
      </svg>
      <div className="auth-network-node n1"><Icon>groups</Icon><span>Leads</span></div>
      <div className="auth-network-node n2"><Icon>target</Icon><span>Pipeline</span></div>
      <div className="auth-network-core"><Icon>memory</Icon><b>AI Core</b></div>
      <div className="auth-network-node n3"><Icon>smart_toy</Icon><span>Agents</span></div>
      <div className="auth-network-node n4"><Icon>trending_up</Icon><span>Revenue</span></div>
    </div>
  );
}

function AuthShell({ mode, children }) {
  const signin = mode === "signin";
  return (
    <div className="auth-page">
      <div className="auth-atmosphere auth-atmosphere-one" />
      <div className="auth-atmosphere auth-atmosphere-two" />

      <div className="auth-shell">
        <section className="auth-brand-panel">
          <a className="auth-brand" href="/">
            <span className="auth-brand-mark"><Icon>token</Icon></span>
            <span><b>Odynza</b><small>AI CRM</small></span>
          </a>

          <div className="auth-copy">
            <div className="auth-eyebrow"><span className="pulse-dot" /> Intelligent CRM Platform</div>
            <h1>{signin ? <>Welcome back to your <span>intelligent CRM.</span></> : <>Build stronger <span>customer relationships.</span></>}</h1>
            <p>
              {signin
                ? "Bring your leads, relationships, and AI-powered workflows back into one intelligent workspace."
                : "Create your Odynza workspace and bring your leads, relationships, and AI-powered workflows together."}
            </p>
          </div>

          <NetworkVisual />

          <div className="auth-mini-stats">
            <div><strong>Lead Intelligence</strong><span>Connected</span></div>
            <div><strong>AI Agent Fleet</strong><span>Ready</span></div>
            <div><strong>CRM Workspace</strong><span>Secure</span></div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-switch">
              <a className={signin ? "active" : ""} href="/signin">Sign In</a>
              <a className={!signin ? "active" : ""} href="/signup">Sign Up</a>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}


export function SignIn() {
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email.trim(), password);
      saveAuthSession(data, remember);
      window.location.href = "/crm";
    } catch (err) {
      setError(err.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="signin">
      <div className="auth-heading">
        <div className="auth-small-label">ODYNZA WORKSPACE</div>
        <h2>Welcome back</h2>
        <p>Sign in to your Odynza workspace.</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>Work Email
          <div className="auth-input">
            <Icon>mail</Icon>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@company.com" autoComplete="email" required />
          </div>
        </label>

        <label>Password
          <div className="auth-input">
            <Icon>lock</Icon>
            <input value={password} onChange={e => setPassword(e.target.value)} type={show ? "text" : "password"} placeholder="••••••••••••" autoComplete="current-password" required />
            <button type="button" onClick={() => setShow(v => !v)} aria-label="Toggle password">
              <Icon>{show ? "visibility_off" : "visibility"}</Icon>
            </button>
          </div>
        </label>

        <div className="auth-options">
          <label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> <span>Remember me</span></label>
        </div>

        {error && <div className="auth-error"><Icon>error</Icon>{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"} <Icon>{loading ? "hourglass_top" : "arrow_forward"}</Icon>
        </button>
      </form>

      <p className="auth-switch-copy">Don't have an account? <a href="/signup">Create Account</a></p>
    </AuthShell>
  );
}

export function SignUp() {
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
  );

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(fullName.trim(), email.trim(), password);
      window.location.href = "/signin";

    } catch (err) {
      setError(err.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="signup">
      <div className="auth-heading">
        <div className="auth-small-label">NEW WORKSPACE</div>
        <h2>Create your account</h2>
        <p>Start managing your customer relationships with Odynza.</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>Full Name
          <div className="auth-input"><Icon>person</Icon><input value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Your full name" autoComplete="name" required /></div>
        </label>

        <label>Work Email
          <div className="auth-input"><Icon>mail</Icon><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@company.com" autoComplete="email" required /></div>
        </label>

        <label>Password
          <div className="auth-input">
            <Icon>lock</Icon>
            <input value={password} onChange={e => setPassword(e.target.value)} type={show ? "text" : "password"} placeholder="Create a password" autoComplete="new-password" required />
            <button type="button" onClick={() => setShow(v => !v)} aria-label="Toggle password"><Icon>{show ? "visibility_off" : "visibility"}</Icon></button>
          </div>
        </label>

        <div className="password-strength">
          <div className="strength-head"><span>Password strength</span><b>{["Enter password","Basic","Good","Strong","Excellent"][strength]}</b></div>
          <div className="strength-bars">{[1,2,3,4].map(i => <i key={i} className={i <= strength ? "filled" : ""} />)}</div>
          <small>Use 8+ characters with a number and a symbol.</small>
        </div>

        <label>Confirm Password
          <div className="auth-input">
            <Icon>lock_reset</Icon>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type={showConfirm ? "text" : "password"} placeholder="Repeat your password" autoComplete="new-password" required />
            <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label="Toggle password"><Icon>{showConfirm ? "visibility_off" : "visibility"}</Icon></button>
          </div>
        </label>

        {error && <div className="auth-error"><Icon>error</Icon>{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading || !password || password !== confirm}>
          {loading ? "Creating Account..." : "Create Account"} <Icon>{loading ? "hourglass_top" : "arrow_forward"}</Icon>
        </button>
      </form>

      <p className="auth-switch-copy">Already have an account? <a href="/signin">Sign In</a></p>
    </AuthShell>
  );
}
