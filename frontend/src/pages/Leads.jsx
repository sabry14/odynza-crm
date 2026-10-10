import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { useAccount } from "../context/AccountContext";
import { getLeads, importLeads } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { formatMoney, getLeadInitials, mapLead } from "../utils/leads";

const ALL_COLUMNS = [
  ["name", "Lead Name"], ["company", "Company"], ["status", "Status"],
  ["value", "Deal Value"], ["owner", "Lead Owner"], ["source", "Source"], ["lastTouch", "Last Touch"],
];

const EXPECTED_HEADERS = ["name", "company", "email", "phone", "domain", "industry", "status", "deal_value", "source", "notes"];
const REQUIRED_HEADERS = ["name", "company", "email"];

function csvEscape(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function inspectCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { headers: [], rows: [], conflicts: ["The CSV file is empty."] };
  const headers = rows[0].map((x) => x.trim().toLowerCase().replace(/^\ufeff/, ""));
  const conflicts = [];
  const unknown = headers.filter((h) => !EXPECTED_HEADERS.includes(h));
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (unknown.length) conflicts.push(`Unknown column(s): ${unknown.join(", ")}`);
  if (missing.length) conflicts.push(`Missing required column(s): ${missing.join(", ")}`);
  if (new Set(headers).size !== headers.length) conflicts.push("Duplicate column names were found in the header.");

  const data = rows.slice(1).map((values, index) => {
    const item = {};
    headers.forEach((header, i) => { item[header] = (values[i] ?? "").trim(); });
    return { rowNumber: index + 2, ...item };
  });

  data.forEach((item) => {
    if (!item.name || !item.company || !item.email) item._conflict = "name, company, and email are required";
    if (item.status && !["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost", "Closed Won", "Closed Lost"].includes(item.status)) item._conflict = `invalid status "${item.status}"`;
    if (item.deal_value && Number.isNaN(Number(item.deal_value.replace(/,/g, "")))) item._conflict = "deal_value must be a number";
    if (item.email && !/^\S+@\S+\.\S+$/.test(item.email)) item._conflict = "invalid email address";
  });
  return { headers, rows: data, conflicts };
}

export default function Leads({ onOpenLead, onAddLead }) {
  const { can } = useAccount();
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(ALL_COLUMNS.map(([key]) => key)));

  const loadLeads = async () => {
    try {
      setLoading(true); setError("");
      const token = getStoredToken();
      if (!token) throw new Error("You are not signed in.");
      const data = await getLeads(token);
      setLeads((data.leads || []).map(mapLead));
    } catch (err) { setError(err.message || "Unable to load leads"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLeads(); }, []);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((lead) => `${lead.name || ""} ${lead.company || ""} ${lead.email || ""} ${lead.domain || ""} ${lead.status || ""} ${lead.owner || ""} ${lead.source || ""}`.toLowerCase().includes(q));
  }, [query, leads]);

  const totalActive = leads.filter((lead) => !["Won", "Lost"].includes(lead.status)).length;
  const qualified = leads.filter((lead) => ["Qualified", "Proposal", "Negotiation"].includes(lead.status)).length;
  const pipelineValue = leads.filter((lead) => !["Won", "Lost"].includes(lead.status)).reduce((sum, lead) => sum + (Number(lead.deal_value) || 0), 0);
  const isVisible = (key) => visibleColumns.has(key);

  const toggleColumn = (key) => setVisibleColumns((current) => {
    const next = new Set(current);
    if (next.has(key)) { if (next.size === 1) return current; next.delete(key); } else next.add(key);
    return next;
  });

  const exportCsv = () => {
    if (!filtered.length) return setToast("No leads to export");
    const columns = ALL_COLUMNS.filter(([key]) => isVisible(key));
    const csv = [columns.map(([, label]) => label), ...filtered.map((lead) => columns.map(([key]) => lead[key] ?? ""))].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "odynza-leads-export.csv"; link.click(); URL.revokeObjectURL(url);
    setToast(`Exported ${filtered.length} leads to CSV`);
  };

  const downloadTemplate = () => {
    const csv = [EXPECTED_HEADERS, ["John Doe", "Acme Corp", "john@acme.com", "+20 100 000 0000", "acme.com", "Technology", "New Lead", "150000", "Inbound Demo", "Example notes"]].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "odynza-leads-template.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const readFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return setToast("Please choose a .csv file");
    const text = await file.text();
    setImportText(text);
    setImportPreview(inspectCsv(text));
  };

  const importCsv = async () => {
    if (!importPreview || importPreview.conflicts.length || importPreview.rows.some((r) => r._conflict)) return;
    try {
      setImporting(true); setError("");
      const token = getStoredToken();
      const cleanRows = importPreview.rows.map(({ _conflict, rowNumber, ...row }) => row);
      const result = await importLeads(token, cleanRows);
      await loadLeads();
      setShowImport(false); setImportText(""); setImportPreview(null);
      const conflictCount = result.conflicts?.length || 0;
      setToast(`${result.imported} lead${result.imported === 1 ? "" : "s"} imported${conflictCount ? `, ${conflictCount} conflict${conflictCount === 1 ? "" : "s"}` : ""}`);
    } catch (err) { setError(err.message || "Unable to import CSV"); }
    finally { setImporting(false); }
  };

  const renderCell = (lead, key) => {
    if (!isVisible(key)) return null;
    if (key === "name") return <td key={key}><div className="lead-cell"><div className="mini-avatar">{getLeadInitials(lead.name)}</div><div><strong>{lead.name}</strong><small>{lead.email || "—"}</small></div></div></td>;
    if (key === "company") return <td key={key}>{lead.company}<small>{lead.domain || "—"}</small></td>;
    if (key === "status") return <td key={key}><span className={`status ${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.status}</span></td>;
    if (key === "value") return <td key={key} className="value">{lead.value}</td>;
    if (key === "owner") return <td key={key}>{lead.owner}</td>;
    if (key === "source") return <td key={key}>{lead.source}</td>;
    if (key === "lastTouch") return <td key={key}>{lead.lastTouch}</td>;
    return null;
  };

  return (
    <main className="page">
      <div className="page-header">
        <div><div className="eyebrow"><span /> LEAD MANAGEMENT <b>•</b> {leads.length} TOTAL</div><h1>Leads</h1><p>Monitor pipeline health, manage prospects, import records, and keep lead data consistent.</p></div>
        {can("create_leads") && <div className="button-row"><button className="secondary-button" onClick={() => setShowImport(true)} type="button"><Icon>upload_file</Icon> Import CSV</button><button className="primary-button" onClick={() => onAddLead?.()} type="button"><Icon>person_add</Icon> Add Lead</button></div>}
      </div>

      <div className="metric-grid">{[["Total Active Leads", totalActive, "Current account", "groups"],["Qualified Opportunities", qualified, "Qualified / proposal / negotiation", "verified"],["Pipeline Value", formatMoney(pipelineValue), "Active pipeline", "trending_up"],["Visible Leads", leads.length, "Based on your permissions", "visibility"]].map(([title, value, sub, icon]) => <div className="metric-card" key={title}><div className="metric-top"><span>{title}</span><Icon>{icon}</Icon></div><strong>{value}</strong><small>{sub}</small></div>)}</div>

      <section className="panel">
        <div className="toolbar leads-toolbar">
          <div className="input-wrap"><Icon>search</Icon><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lead name, company, email, or domain..." /></div>
          <div className="toolbar-action-wrap"><button className="secondary-button" onClick={() => setShowColumns((v) => !v)} type="button"><Icon>view_column</Icon> Columns</button>{showColumns && <div className="columns-menu"><strong>Visible columns</strong>{ALL_COLUMNS.map(([key, label]) => <label key={key} className="column-option"><input type="checkbox" checked={isVisible(key)} onChange={() => toggleColumn(key)} /><span>{label}</span></label>)}</div>}</div>
          <button className="secondary-button" onClick={exportCsv} type="button"><Icon>download</Icon> Export CSV</button>
        </div>
        {loading && <div className="empty-state">Loading leads...</div>}
        {error && !loading && <div className="error-state">{error}</div>}
        {!loading && !error && <div className="table-scroll"><table className="leads-table"><thead><tr>{ALL_COLUMNS.map(([key, label]) => isVisible(key) ? <th key={key}>{label}</th> : null)}</tr></thead><tbody>{filtered.map((lead) => <tr key={lead.id} onClick={() => onOpenLead?.(lead)}>{ALL_COLUMNS.map(([key]) => renderCell(lead, key))}</tr>)}{!filtered.length && <tr><td colSpan={visibleColumns.size} style={{ textAlign: "center", padding: "32px" }}>No leads found.</td></tr>}</tbody></table></div>}
      </section>

      {showImport && can("create_leads") && <div className="lead-modal-backdrop" onMouseDown={() => !importing && setShowImport(false)}>
        <div className="lead-modal csv-import-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="lead-modal-header"><div className="lead-modal-title"><div className="lead-modal-icon"><Icon>upload_file</Icon></div><div><h2>Import Leads from CSV</h2><p>Check your headers and rows before anything is inserted.</p></div></div><button className="icon-button" type="button" onClick={() => setShowImport(false)}><Icon>close</Icon></button></div>
          <div className="csv-parameter-box"><div><strong>Required columns</strong><span>{REQUIRED_HEADERS.join(", ")}</span></div><div><strong>Optional columns</strong><span>{EXPECTED_HEADERS.filter((x) => !REQUIRED_HEADERS.includes(x)).join(", ")}</span></div><p><Icon>warning</Icon> Use the exact parameter names above. Unknown columns, missing required columns, invalid status values, invalid emails, or invalid deal values will be shown as conflicts and will block the import until fixed.</p></div>
          <div className="csv-import-actions"><button className="secondary-button" type="button" onClick={downloadTemplate}><Icon>download</Icon> Download Template</button><button className="primary-button" type="button" onClick={() => fileRef.current?.click()}><Icon>folder_open</Icon> Choose CSV</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} /></div>
          {importPreview && <div className="csv-preview"><div className="csv-preview-head"><strong>{importPreview.rows.length} data row(s) detected</strong><span>{importPreview.conflicts.length + importPreview.rows.filter((r) => r._conflict).length} conflict(s)</span></div>{importPreview.conflicts.map((x) => <div className="csv-conflict" key={x}><Icon>error</Icon>{x}</div>)}{importPreview.rows.filter((r) => r._conflict).slice(0, 12).map((r) => <div className="csv-conflict" key={r.rowNumber}><Icon>error</Icon>Row {r.rowNumber}: {r._conflict}</div>)}{!importPreview.conflicts.length && !importPreview.rows.some((r) => r._conflict) && <div className="csv-ok"><Icon>check_circle</Icon>CSV format looks valid. Ready to import.</div>}<div className="csv-sample-table"><table><thead><tr>{importPreview.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{importPreview.rows.slice(0, 4).map((r) => <tr key={r.rowNumber}>{importPreview.headers.map((h) => <td key={h}>{r[h] || "—"}</td>)}</tr>)}</tbody></table></div></div>}
          <div className="lead-modal-footer"><button className="secondary-button" type="button" onClick={() => setShowImport(false)} disabled={importing}>Cancel</button><button className="primary-button" type="button" onClick={importCsv} disabled={importing || !importPreview || !!importPreview.conflicts.length || importPreview.rows.some((r) => r._conflict)}><Icon>upload</Icon>{importing ? "Importing..." : "Import Leads"}</button></div>
        </div>
      </div>}

      {toast && <div className="app-toast"><Icon>check_circle</Icon>{toast}</div>}
    </main>
  );
}
