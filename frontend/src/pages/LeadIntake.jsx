import React, { useState } from "react";
import Icon from "../components/Icon";
import { createLead } from "../services/api";
import { getStoredToken } from "../utils/auth";

const SOURCE_OPTIONS = [
  "Inbound Demo",
  "Enterprise Referral",
  "Product Hunt",
  "Self-Serve Trial",
  "LinkedIn Outreach",
  "Event Sponsor",
];

const STAGES = ["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const INDUSTRIES = ["Technology", "SaaS", "FinTech", "Healthcare", "Cybersecurity", "E-commerce", "Other"];

const initialForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  domain: "",
  industry: "Technology",
  status: "New Lead",
  deal_value: "",
  source: "Inbound Demo",
  notes: "",
};

function getStoredUser() {
  const raw = localStorage.getItem("odynza_user") || sessionStorage.getItem("odynza_user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function LeadIntake({ onBack, onCreated }) {
  const user = getStoredUser();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) return setError("You are not signed in.");

    if (!form.name.trim() || !form.company.trim() || !form.email.trim()) {
      return setError("Name, company, and email are required.");
    }

    try {
      setSaving(true);
      setError("");
      const data = await createLead(token, {
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        domain: form.domain.trim() || null,
        industry: form.industry || null,
        status: form.status,
        deal_value: Number(String(form.deal_value).replace(/,/g, "")) || 0,
        source: form.source || null,
        notes: form.notes.trim() || null,
        owner_id: user?.id,
      });

      setToast(`Lead "${data.lead?.name || form.name}" created successfully`);
      setTimeout(() => onCreated?.(data.lead), 450);
    } catch (err) {
      setError(err.message || "Unable to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page lead-intake-page">
      <div className="lead-intake-top">
        <button className="back-button" type="button" onClick={onBack}>
          <Icon>arrow_back</Icon> Leads <span>/</span> <b>Create New Lead</b>
        </button>
        <div className="lead-intake-title-row">
          <div>
            <div className="eyebrow"><span /> LEAD INTAKE</div>
            <h1>New Lead Intake</h1>
            <p>Create a lead using the fields supported by the Odynza CRM database.</p>
          </div>
          <button className="primary-button" type="submit" form="lead-intake-form" disabled={saving}>
            <Icon>{saving ? "sync" : "person_add"}</Icon>
            {saving ? "Creating..." : "Create Lead"}
          </button>
        </div>
      </div>

      {error && <div className="error-state lead-intake-error">{error}</div>}

      <form id="lead-intake-form" className="lead-intake-grid" onSubmit={submit}>
        <div className="lead-intake-main">
          <section className="intake-card">
            <div className="intake-card-accent purple" />
            <div className="intake-card-head">
              <div className="intake-icon purple"><Icon>badge</Icon></div>
              <div><h2>Lead Information</h2><p>Core identity and company information</p></div>
              <span>STEP 01</span>
            </div>
            <div className="intake-fields">
              <label>Full Name *<input name="name" value={form.name} onChange={change} placeholder="e.g. Alex Thorne" required /></label>
              <label>Company Name *<input name="company" value={form.company} onChange={change} placeholder="e.g. CloudMatrix AI Labs" required /></label>
              <label>Company Domain / URL<input name="domain" value={form.domain} onChange={change} placeholder="e.g. cloudmatrix.ai" /></label>
              <label>Industry<select name="industry" value={form.industry} onChange={change}>{INDUSTRIES.map((x) => <option key={x}>{x}</option>)}</select></label>
            </div>
          </section>

          <section className="intake-card">
            <div className="intake-card-accent blue" />
            <div className="intake-card-head">
              <div className="intake-icon blue"><Icon>alternate_email</Icon></div>
              <div><h2>Contact & Communication</h2><p>Direct contact details for the lead</p></div>
              <span>STEP 02</span>
            </div>
            <div className="intake-fields">
              <label className="full-field">Email Address *<input name="email" value={form.email} onChange={change} type="email" placeholder="e.g. alex@company.com" required /></label>
              <label>Phone Number<input name="phone" value={form.phone} onChange={change} type="tel" placeholder="e.g. +20 100 000 0000" /></label>
            </div>
          </section>

          <section className="intake-card">
            <div className="intake-card-accent cyan" />
            <div className="intake-card-head">
              <div className="intake-icon cyan"><Icon>notes</Icon></div>
              <div><h2>Discovery & Notes</h2><p>Pain points, requirements, timeline, and context</p></div>
              <span>STEP 03</span>
            </div>
            <textarea className="intake-notes" name="notes" value={form.notes} onChange={change} placeholder="Add requirements, pain points, timeline, budget, or other useful context..." rows={9} />
          </section>
        </div>

        <div className="lead-intake-side">
          <section className="intake-card">
            <div className="intake-card-head no-step">
              <div className="intake-icon neutral"><Icon>candlestick_chart</Icon></div>
              <div><h2>Deal Qualification</h2><p>Pipeline stage and commercial information</p></div>
            </div>

            <label>Pipeline Stage</label>
            <div className="stage-selector stage-selector-wide">
              {STAGES.map((stage) => (
                <button key={stage} type="button" className={form.status === stage ? "selected" : ""} onClick={() => setForm((c) => ({ ...c, status: stage }))}>{stage}</button>
              ))}
            </div>

            <label>Estimated Deal Value <small>USD</small><input name="deal_value" value={form.deal_value} onChange={change} inputMode="decimal" placeholder="150000" /></label>
            <label>Lead Owner<input value={user?.full_name || "Current user"} disabled /></label>
            <label>Lead Source<select name="source" value={form.source} onChange={change}>{SOURCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </section>

          <section className="intake-card import-parameter-card">
            <div className="intake-card-head no-step">
              <div className="intake-icon neutral"><Icon>rule</Icon></div>
              <div><h2>CSV Parameters</h2><p>Use these exact headers when importing leads.</p></div>
            </div>
            <div className="parameter-line"><b>Required</b><span>name, company, email</span></div>
            <div className="parameter-line"><b>Optional</b><span>phone, domain, industry, status, deal_value, source, notes</span></div>
            <div className="parameter-warning"><Icon>info</Icon><span>Unknown column names or missing required columns will be reported as conflicts before import.</span></div>
          </section>

          <button className="primary-button full-action" type="submit" disabled={saving}><Icon>check_circle</Icon>{saving ? "Creating..." : "Create Lead"}</button>
          <button className="secondary-button full-action" type="button" onClick={onBack} disabled={saving}>Cancel</button>
        </div>
      </form>

      {toast && <div className="app-toast"><Icon>check_circle</Icon>{toast}</div>}
    </main>
  );
}
