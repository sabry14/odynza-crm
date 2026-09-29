import React, { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { createLead, getCurrentUser, getLeads } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { formatMoney, getLeadInitials, mapLead } from "../utils/leads";

const ALL_COLUMNS = [
  ["name", "Lead Name"],
  ["company", "Company"],
  ["status", "Status"],
  ["value", "Deal Value"],
  ["owner", "Lead Owner"],
  ["source", "Source"],
  ["lastTouch", "Last Touch"],
];

const STATUS_OPTIONS = [
  ["New Lead", "New Lead"],
  ["Contacted", "Contacted"],
  ["Qualified", "Qualified"],
  ["Proposal", "Proposal"],
  ["Negotiation", "Negotiation"],
  ["Won", "Closed Won"],
  ["Lost", "Closed Lost"],
];

const SOURCE_OPTIONS = [
  "Inbound Demo",
  "Enterprise Referral",
  "Product Hunt",
  "Self-Serve Trial",
  "LinkedIn Outreach",
  "Event Sponsor",
];

function getStoredUser() {
  const raw = localStorage.getItem("odynza_user") || sessionStorage.getItem("odynza_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emptyForm(user) {
  return {
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
    owner_id: user?.id || "",
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Leads({ onOpenLead }) {
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    () => new Set(ALL_COLUMNS.map(([key]) => key))
  );
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [form, setForm] = useState(() => emptyForm(getStoredUser()));

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError("");
      const token = getStoredToken();
      if (!token) throw new Error("You are not signed in.");

      const data = await getLeads(token);
      setLeads((data.leads || []).map(mapLead));
    } catch (err) {
      setError(err.message || "Unable to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    getCurrentUser(token)
      .then((data) => {
        const user = data.user || data;
        if (user) {
          setCurrentUser(user);
          setForm((current) => ({ ...current, owner_id: user.id }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return leads;

    return leads.filter((lead) =>
      `${lead.name || ""} ${lead.company || ""} ${lead.email || ""} ${lead.domain || ""} ${lead.status || ""} ${lead.owner || ""} ${lead.source || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, leads]);

  const totalActive = leads.filter(
    (lead) => !["Won", "Lost"].includes(lead.status)
  ).length;

  const qualified = leads.filter((lead) =>
    ["Qualified", "Proposal", "Negotiation"].includes(lead.status)
  ).length;

  const pipelineValue = leads
    .filter((lead) => !["Won", "Lost"].includes(lead.status))
    .reduce((sum, lead) => sum + (Number(lead.deal_value) || 0), 0);

  const isVisible = (key) => visibleColumns.has(key);

  const toggleColumn = (key) => {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        if (next.size === 1) return current;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateLead = async (event) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      setError("You are not signed in.");
      return;
    }

    if (!form.name.trim() || !form.company.trim() || !form.email.trim()) {
      setError("Name, company, and email are required.");
      return;
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
        source: form.source,
        notes: form.notes.trim() || null,
        owner_id: form.owner_id || currentUser?.id,
      });

      const newLead = mapLead(data.lead);
      setLeads((current) => [newLead, ...current]);
      setForm(emptyForm(currentUser));
      setShowAddLead(false);
      setToast(`Lead "${newLead.name}" created successfully`);
    } catch (err) {
      setError(err.message || "Unable to create lead");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) {
      setToast("No leads to export");
      return;
    }

    const headers = ALL_COLUMNS.filter(([key]) => isVisible(key)).map(([, label]) => label);
    const rows = filtered.map((lead) =>
      ALL_COLUMNS
        .filter(([key]) => isVisible(key))
        .map(([key]) => lead[key] ?? "")
    );

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "odynza-leads-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast(`Exported ${filtered.length} leads to CSV`);
  };

  const closeModal = () => {
    if (!saving) {
      setShowAddLead(false);
      setForm(emptyForm(currentUser));
    }
  };

  const renderCell = (lead, key) => {
    if (!isVisible(key)) return null;

    if (key === "name") {
      return (
        <td key={key}>
          <div className="lead-cell">
            <div className="mini-avatar">{getLeadInitials(lead.name)}</div>
            <div>
              <strong>{lead.name}</strong>
              <small>{lead.role}</small>
            </div>
          </div>
        </td>
      );
    }
    if (key === "company") {
      return <td key={key}>{lead.company}<small>{lead.domain || lead.location}</small></td>;
    }
    if (key === "status") {
      return (
        <td key={key}>
          <span className={`status ${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
            {lead.status}
          </span>
        </td>
      );
    }
    if (key === "value") return <td key={key} className="value">{lead.value}</td>;
    if (key === "owner") return <td key={key}>{lead.owner}</td>;
    if (key === "source") return <td key={key}>{lead.source}</td>;
    if (key === "lastTouch") return <td key={key}>{lead.lastTouch}</td>;
    return null;
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow"><span /> LEAD MANAGEMENT <b>•</b> {leads.length} TOTAL</div>
          <h1>Leads</h1>
          <p>Monitor pipeline health, prioritize high-value prospects, and accelerate initial touchpoints.</p>
        </div>
        <button className="primary-button" onClick={() => setShowAddLead(true)} type="button">
          <Icon>person_add</Icon> Add Lead
        </button>
      </div>

      <div className="metric-grid">
        {[
          ["Total Active Leads", totalActive, "Current account", "groups"],
          ["Qualified Opportunities", qualified, "Qualified / proposal / negotiation", "verified"],
          ["Pipeline Value", formatMoney(pipelineValue), "Active pipeline", "trending_up"],
          ["Visible Leads", leads.length, "Based on your permissions", "visibility"],
        ].map(([title, value, sub, icon]) => (
          <div className="metric-card" key={title}>
            <div className="metric-top"><span>{title}</span><Icon>{icon}</Icon></div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="toolbar leads-toolbar">
          <div className="input-wrap">
            <Icon>search</Icon>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lead name, company, email, or domain..." />
          </div>
          <div className="toolbar-action-wrap">
            <button className="secondary-button" onClick={() => setShowColumns((value) => !value)} type="button">
              <Icon>view_column</Icon> Columns
            </button>
            {showColumns && (
              <div className="columns-menu">
                <strong>Visible columns</strong>
                {ALL_COLUMNS.map(([key, label]) => (
                  <label key={key} className="column-option">
                    <input type="checkbox" checked={isVisible(key)} onChange={() => toggleColumn(key)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="secondary-button" onClick={exportCsv} type="button">
            <Icon>download</Icon> Export CSV
          </button>
        </div>

        {loading && <div className="empty-state">Loading leads...</div>}
        {error && !loading && <div className="error-state">{error}</div>}

        {!loading && !error && (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>{ALL_COLUMNS.map(([key, label]) => isVisible(key) ? <th key={key}>{label}</th> : null)}</tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} onClick={() => onOpenLead && onOpenLead(lead)}>
                    {ALL_COLUMNS.map(([key]) => renderCell(lead, key))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={visibleColumns.size} style={{ textAlign: "center", padding: "32px" }}>No leads found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddLead && (
        <div className="lead-modal-backdrop" onMouseDown={closeModal}>
          <div className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="add-lead-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="lead-modal-title">
                <div className="lead-modal-icon"><Icon>person_add</Icon></div>
                <div><h2 id="add-lead-title">Add New Lead</h2><p>Create a qualified CRM prospect with ownership and valuation.</p></div>
              </div>
              <button className="icon-button" onClick={closeModal} type="button"><Icon>close</Icon></button>
            </div>

            <form className="lead-modal-form" onSubmit={handleCreateLead}>
              <div className="lead-form-grid">
                <label>Lead Name *<input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Jane Doe" required /></label>
                <label>Company *<input name="company" value={form.company} onChange={handleFormChange} placeholder="e.g. Acme Corp" required /></label>
                <label>Email Address *<input name="email" value={form.email} onChange={handleFormChange} type="email" placeholder="e.g. jane@acmecorp.com" required /></label>
                <label>Phone Number<input name="phone" value={form.phone} onChange={handleFormChange} placeholder="e.g. +20 100 000 0000" /></label>
                <label>Company Domain<input name="domain" value={form.domain} onChange={handleFormChange} placeholder="e.g. acmecorp.com" /></label>
                <label>Industry<select name="industry" value={form.industry} onChange={handleFormChange}><option>Technology</option><option>Cloud Services</option><option>FinTech</option><option>Healthcare</option><option>Cybersecurity</option><option>E-commerce</option></select></label>
                <label>Status<select name="status" value={form.status} onChange={handleFormChange}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Deal Value (USD)<input name="deal_value" value={form.deal_value} onChange={handleFormChange} inputMode="decimal" placeholder="150,000" /></label>
                <label>Lead Owner<input value={currentUser?.full_name || "Current user"} disabled /></label>
                <label>Lead Source<select name="source" value={form.source} onChange={handleFormChange}>{SOURCE_OPTIONS.map((source) => <option key={source}>{source}</option>)}</select></label>
              </div>
              <label className="lead-form-full">Notes & Context<textarea name="notes" value={form.notes} onChange={handleFormChange} rows="4" placeholder="Enter initial qualification notes, requirements, or context..." /></label>
              <div className="lead-modal-footer">
                <button className="secondary-button" onClick={closeModal} type="button" disabled={saving}>Cancel</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? <><Icon>sync</Icon> Creating...</> : <><Icon>check</Icon> Create Lead</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="app-toast"><Icon>check_circle</Icon>{toast}</div>}
    </main>
  );
}
