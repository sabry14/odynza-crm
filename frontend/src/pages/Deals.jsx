import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { useAccount } from "../context/AccountContext";
import { getDashboard, getLeadActivities, updateLead } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { formatMoney, getLeadInitials } from "../utils/leads";
import { ALL_LEAD_STAGES, CLOSED_DEAL_STAGES, DEAL_COLORS, OPEN_DEAL_STAGES, canUpdateDeal, dealPatch, dealStage, dealSummary, filterDeals, opportunityRecords, sortDeals, totalDealValue } from "../utils/deals";
import "../deals.css";

const dateLabel = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No activity recorded";
const nextStage = (lead) => ({ Qualified: "Proposal", Proposal: "Negotiation" }[dealStage(lead)]);
const TABS = [["board", "Board", "view_kanban"], ["list", "List", "view_agenda"], ["closed", "Closed", "verified"]];

function StageBadge({ lead }) {
  return <span className="deals-stage" style={{ "--deal-color": DEAL_COLORS[dealStage(lead)] || "#64748b" }}>{dealStage(lead)}</span>;
}

// Native modal dialogs provide focus trapping, Escape support and focus restoration.
function DealDialog({ className = "", labelId, onClose, busy = false, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`deals-dialog ${className}`} aria-labelledby={labelId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target !== ref.current || busy) return; const box = ref.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); }}>
    {children}
  </dialog>;
}

function DealDrawer({ lead, user, busy, onClose, onStage, onSaveNotes, onOpenLead, revision, activityAvailable }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [editing, setEditing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [noteError, setNoteError] = useState("");
  const canStage = canUpdateDeal(user, lead, "update_lead_status");
  const canNotes = canUpdateDeal(user, lead, "add_lead_notes");
  useEffect(() => { setNotes(lead.notes || ""); setEditing(false); }, [lead.notes]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError(""); setActivities([]);
    if (!activityAvailable) { clearTimeout(timeout); setLoading(false); return () => { active = false; controller.abort(); }; }
    getLeadActivities(getStoredToken(), lead.id, controller.signal)
      .then((data) => { if (active) setActivities(data.activities || []); })
      .catch((err) => { if (active) setError(err.name === "AbortError" ? "Activity request timed out. Please retry." : err.message || "Unable to load activity"); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [lead.id, revision, attempt, activityAvailable]);
  const close = () => {
    if (editing && notes !== (lead.notes || "") && !window.confirm("Discard your unsaved notes?")) return;
    onClose();
  };
  const saveNotes = async () => {
    setNoteError("");
    const saved = await onSaveNotes(lead, notes);
    if (saved) setEditing(false);
    else setNoteError("Notes were not saved. Your draft is still here; you can try again.");
  };
  return <DealDialog className="deals-drawer" labelId="deal-drawer-heading" onClose={close} busy={busy}>
    <header className="deals-drawer-header"><div><span className="deals-eyebrow">Opportunity · Lead #{lead.id}</span><h2 id="deal-drawer-heading">{lead.company || lead.name}</h2></div><button className="deals-icon" aria-label="Close opportunity details" disabled={busy} onClick={close} autoFocus><Icon>close</Icon></button></header>
    <div className="deals-drawer-body">
      <section className="deals-record"><div className="deals-section-title"><h3>Linked lead record</h3><button className="deals-link" disabled={busy} onClick={() => { if (editing && notes !== (lead.notes || "") && !window.confirm("Discard your unsaved notes?")) return; onOpenLead(lead); }}>{lead.name}<Icon>open_in_new</Icon></button></div>
        <div className="deals-record-grid"><label>Current stage{canStage ? <select aria-label="Opportunity stage" value={dealStage(lead)} disabled={busy} onChange={(event) => onStage(lead, event.target.value)}>{ALL_LEAD_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select> : <StageBadge lead={lead} />}</label><div><span>Estimated value · USD</span><strong>{formatMoney(lead.deal_value)}</strong></div></div>
      </section>
      <section><h3>Key account contact</h3><div className="deals-contact"><span className="deals-avatar">{getLeadInitials(lead.name)}</span><div><strong>{lead.name}</strong><span>{lead.email || "Email not recorded"}</span><span>{lead.phone || "Phone not recorded"}</span></div>{lead.email && <a className="deals-icon" href={`mailto:${lead.email}`} aria-label={`Email ${lead.name}`}><Icon>mail</Icon></a>}</div></section>
      <section className="deals-owner-detail"><Icon>badge</Icon><span>Opportunity owner</span><strong>{lead.owner_name || "Unassigned"}</strong></section>
      <section><div className="deals-section-title"><h3>Account notes</h3>{canNotes && !editing && <button className="deals-link" disabled={busy} onClick={() => { setEditing(true); setNoteError(""); }}><Icon>edit_note</Icon>Edit notes</button>}</div>
        {editing ? <div className="deals-notes-form"><label htmlFor="opportunity-notes" className="deals-sr-only">Account notes</label><textarea id="opportunity-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={busy} rows={6} autoFocus /><p>Saved to the linked lead’s notes. This replaces the existing note text.</p>{noteError && <p role="alert" className="deals-danger">{noteError}</p>}<div className="deals-actions"><button className="secondary-button" disabled={busy} onClick={() => { setNotes(lead.notes || ""); setEditing(false); }}>Cancel</button><button className="primary-button" disabled={busy || notes === (lead.notes || "")} onClick={saveNotes}><Icon>save</Icon>{busy ? "Saving…" : "Save notes"}</button></div></div> : <p className="deals-notes">{lead.notes || "No notes recorded for this opportunity."}</p>}
      </section>
      <section><h3>Activity timeline</h3>{loading ? <p role="status" className="deals-muted">Loading recorded activity…</p> : error ? <div className="deals-inline-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setAttempt((value) => value + 1)}>Retry activity</button></div> : !activityAvailable ? <p className="deals-muted">Activity history is unavailable for this database.</p> : activities.length ? <ol className="deals-timeline">{activities.map((activity) => <li key={activity.id}><strong>{activity.title}</strong><p>{activity.description}</p><span>{dateLabel(activity.created_at)} · {activity.actor_name || "Actor not recorded"}</span></li>)}</ol> : <p className="deals-muted">No activity recorded. No sample events have been added.</p>}</section>
      <p className="deals-disclaimer">This opportunity uses the linked lead’s saved stage, value, notes, and history. Values are estimates, not recurring revenue or payments.</p>
    </div>
    <footer className="deals-drawer-footer"><button className="secondary-button" disabled={busy} onClick={close}>Close pane</button>{canStage && (nextStage(lead) ? <button className="primary-button" disabled={busy} onClick={() => onStage(lead, nextStage(lead))}>Advance to {nextStage(lead)}<Icon>arrow_forward</Icon></button> : dealStage(lead) === "Negotiation" ? <div className="deals-actions"><button className="secondary-button deals-lost" disabled={busy} onClick={() => onStage(lead, "Lost")}>Mark lost</button><button className="primary-button" disabled={busy} onClick={() => onStage(lead, "Won")}><Icon>check_circle</Icon>Mark won</button></div> : null)}</footer>
  </DealDialog>;
}

export default function Deals({ onOpenLead, onNewOpportunity, onViewLeads }) {
  const { user, can } = useAccount();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("board");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [stage, setStage] = useState("");
  const [closed, setClosed] = useState("all");
  const [sort, setSort] = useState({ field: "deal_value", direction: "desc" });
  const [selectedId, setSelectedId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [revision, setRevision] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const [dropStage, setDropStage] = useState(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const snapshotRequest = useRef(null);
  const tabRefs = useRef([]);
  const load = useCallback(async () => {
    const current = ++generation.current;
    snapshotRequest.current?.abort();
    const controller = new AbortController();
    snapshotRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError("");
    try {
      const result = await getDashboard(getStoredToken(), controller.signal);
      if (!alive.current || current !== generation.current) return false;
      setData(result); return true;
    } catch (err) { if (alive.current && current === generation.current) setError(err.name === "AbortError" ? "The CRM connection timed out. Check your connection and retry." : err.message || "Unable to load opportunities"); return false; }
    finally { clearTimeout(timeout); if (alive.current && current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false; generation.current += 1; snapshotRequest.current?.abort(); }; }, [load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 5500); return () => clearTimeout(timer); }, [toast]);

  const records = useMemo(() => opportunityRecords(data?.leads || []), [data]);
  const summary = dealSummary(records);
  const rows = sortDeals(filterDeals(records, { query, owner, stage, closed, view: tab }), sort.field, sort.direction);
  const openCount = filterDeals(records, { query, owner }).length;
  const closedRecords = filterDeals(records, { query, owner, view: "closed" });
  const selected = data?.leads.find((lead) => Number(lead.id) === Number(selectedId));
  const ownerOptions = useMemo(() => [...new Map(records.map((lead) => [String(lead.owner_id ?? "unassigned"), lead.owner_name || "Unassigned"])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [records]);
  const reset = () => { setQuery(""); setOwner(""); setStage(""); setClosed("all"); };
  const selectTab = (next) => { setTab(next); setStage(""); setClosed("all"); };
  const handleTabKey = (event, index) => {
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); selectTab(TABS[next][0]); tabRefs.current[next]?.focus();
  };
  const requestStage = (lead, target) => {
    if (busy || loading || target === dealStage(lead)) return;
    try { dealPatch(user, lead, "status", target); setConfirmation({ leadId: lead.id, from: dealStage(lead), target, error: "" }); }
    catch (err) { setToast(err.message); }
  };

  const persist = async (lead, kind, value) => {
    if (busy || loading) return false;
    let result;
    try {
      const patch = dealPatch(user, lead, kind, value);
      setBusy(true);
      result = await updateLead(getStoredToken(), lead.id, patch);
    } catch (err) {
      if (alive.current) {
        if (kind === "status") setConfirmation((current) => current ? { ...current, error: err.message || "Stage change failed. Nothing has moved." } : null);
        else setToast(err.message || "Notes were not saved");
        setBusy(false);
      }
      return false;
    }
    if (!alive.current) return true;
    // Use the server response, never a speculative move or a demo-generated event.
    setData((current) => ({ ...current, leads: current.leads.map((item) => item.id === result.lead.id ? { ...result.lead, last_activity_at: item.last_activity_at } : item) }));
    if (kind === "status") setConfirmation(null);
    setRevision((value) => value + 1);
    const refreshed = await load();
    if (alive.current) {
      setBusy(false);
      setToast(`${kind === "status" ? `Stage saved as ${value}.` : "Notes saved."}${refreshed ? "" : " Latest activity could not be refreshed; try Refresh."}`);
    }
    return true;
  };
  const confirmStage = () => {
    const lead = data.leads.find((item) => item.id === confirmation.leadId);
    if (!lead || dealStage(lead) !== confirmation.from) { setConfirmation((current) => ({ ...current, error: "This opportunity has changed. Close this dialog, refresh, and try again." })); return; }
    persist(lead, "status", confirmation.target);
  };
  const sortBy = (field) => setSort((current) => ({ field, direction: current.field === field && current.direction === "asc" ? "desc" : "asc" }));
  const latestByLead = new Map();
  for (const activity of data?.activities || []) if (!latestByLead.has(activity.lead_id)) latestByLead.set(activity.lead_id, activity);
  const canStage = (lead) => canUpdateDeal(user, lead, "update_lead_status");
  const filtersApplied = !!(query.trim() || owner || stage || closed !== "all");
  const empty = <div className="deals-empty"><Icon>{filtersApplied ? "search_off" : "view_kanban"}</Icon><h2>{filtersApplied ? "No matching opportunities" : tab === "closed" ? "No closed opportunities yet" : "Your opportunity board is ready"}</h2><p>{filtersApplied ? "Try another search or clear your filters." : tab === "closed" ? "Won and Lost records will appear here when their stages are saved." : "Leads become opportunities here when they reach Qualified, Proposal, or Negotiation."}</p>{filtersApplied ? <button className="secondary-button" onClick={reset}>Clear filters</button> : <button className="secondary-button" onClick={onViewLeads}>View leads<Icon>arrow_forward</Icon></button>}</div>;
  const table = <div className="deals-table-wrap"><table className="deals-table"><thead><tr>{[["company", "Company / contact"], ["status", tab === "closed" ? "Outcome" : "Stage"], ["deal_value", "Estimated value"], ["owner_name", "Owner"], ["last_activity_at", "Last recorded activity"]].map(([field, label]) => <th key={field} aria-sort={sort.field === field ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => sortBy(field)}>{label}<Icon>{sort.field === field ? sort.direction === "asc" ? "arrow_upward" : "arrow_downward" : "unfold_more"}</Icon></button></th>)}<th>Details</th></tr></thead><tbody>{rows.map((lead) => <tr key={lead.id}><td><strong>{lead.company || "Company not recorded"}</strong><span>{lead.name}</span></td><td><StageBadge lead={lead} /></td><td className="deals-number">{formatMoney(lead.deal_value)}</td><td>{lead.owner_name || "Unassigned"}</td><td className="deals-muted">{dateLabel(lead.last_activity_at)}</td><td><button className="deals-link" aria-label={`View opportunity for ${lead.company || lead.name}`} onClick={() => setSelectedId(lead.id)}>View<Icon>north_east</Icon></button></td></tr>)}</tbody></table></div>;

  return <main className="page deals-page">
    <div className="deals-heading"><div><div className="deals-title"><h1>Deals</h1><span className="deals-tag">Core pipeline</span></div><p>Move opportunities forward and close your next sale.</p></div><div className="deals-actions"><button className="secondary-button" disabled={loading || busy} onClick={load}><Icon>refresh</Icon>{loading ? "Refreshing…" : "Refresh"}</button>{can("create_leads") && <button className="primary-button" disabled={busy} onClick={onNewOpportunity}><Icon>add</Icon>New opportunity</button>}</div></div>
    {toast && <div className="deals-toast" role="status">{toast}</div>}
    <div className="deals-scope"><span>{user.role === "admin" ? "Organization opportunities" : user.role === "catalog_manager" ? "Organization opportunities · read-only" : "Your opportunities"} · Account totals</span><span>{data ? `Updated ${dateLabel(data.generatedAt)}` : error ? "Connection unavailable" : "Connecting to your CRM…"}</span></div>
    <div className="deals-summary" aria-busy={loading}>{[["all_inbox", "Open opportunities", data ? `${summary.open} active` : "—", "Qualified through negotiation"], ["payments", "Estimated pipeline value", data ? formatMoney(summary.value) : "—", data && summary.open ? `Average ${formatMoney(summary.average)}` : "Open opportunity estimates · USD"], ["handshake", "In negotiation", data ? `${summary.negotiating} ${summary.negotiating === 1 ? "opportunity" : "opportunities"}` : "—", data ? `${formatMoney(summary.negotiationValue)}${summary.negotiationShare === null ? "" : ` · ${Math.round(summary.negotiationShare)}% of open value`}` : "—"]].map(([icon, label, value, detail]) => <article key={label}><span className="deals-summary-icon"><Icon>{icon}</Icon></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}</div>
    {!can("update_lead_status") && <div className="deals-readonly"><Icon>lock</Icon><p>Stages are read-only for your account. You can inspect opportunities but cannot move them.</p></div>}
    <div className="deals-toolbar"><div role="tablist" aria-label="Deal views" className="deals-tabs">{TABS.map(([id, label, icon], index) => <button ref={(element) => { tabRefs.current[index] = element; }} role="tab" id={`deals-tab-${id}`} aria-controls="deals-content" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} onKeyDown={(event) => handleTabKey(event, index)} onClick={() => selectTab(id)}><Icon>{icon}</Icon>{label}<span>{data ? id === "closed" ? closedRecords.length : openCount : "—"}</span></button>)}</div>
      <div className="deals-filters"><label className="deals-search"><Icon>search</Icon><span className="deals-sr-only">Search opportunities</span><input placeholder="Search companies, leads, or email…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear opportunity search" onClick={() => setQuery("")}><Icon>close</Icon></button>}</label><label><span className="deals-sr-only">Filter by stage</span><select aria-label="Filter by stage" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{(tab === "closed" ? CLOSED_DEAL_STAGES : OPEN_DEAL_STAGES).map((item) => <option key={item}>{item}</option>)}</select></label>{user.role === "admin" && <label><span className="deals-sr-only">Filter by owner</span><select aria-label="Filter by owner" value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">All owners</option>{ownerOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>}<button className="deals-reset" onClick={reset} disabled={!filtersApplied}>Clear filters</button></div>
    </div>
    {error && <div className="deals-inline-error" role="alert"><p>{error}{data ? " The last loaded records remain visible; updates are unavailable until a successful refresh." : ""}</p><button className="secondary-button" disabled={loading || busy} onClick={load}>Retry</button></div>}
    <div role="tabpanel" id="deals-content" tabIndex={0} aria-labelledby={`deals-tab-${tab}`} aria-busy={loading}>
      {loading && !data ? <div className="deals-loading" role="status"><Icon>sync</Icon>Loading your opportunities…</div> : !data ? null : tab === "board" ? <>
        {!rows.length && empty}
        <div className="deals-board">{OPEN_DEAL_STAGES.map((column) => {
          const columnRows = rows.filter((lead) => dealStage(lead) === column);
          return <section key={column} className={`deals-column ${dropStage === column ? "deals-drop-target" : ""}`} style={{ "--deal-color": DEAL_COLORS[column] }} aria-label={`${column} opportunities`}
            onDragOver={(event) => { if (busy || error || !draggedId) return; const lead = records.find((record) => record.id === draggedId); if (lead && canStage(lead) && dealStage(lead) !== column) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropStage(column); } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropStage(null); }}
            onDrop={(event) => { event.preventDefault(); const lead = records.find((record) => record.id === draggedId); setDraggedId(null); setDropStage(null); if (lead && !error) requestStage(lead, column); }}>
            <header><div><span className="deals-stage-dot" /><h2>{column}</h2><span className="deals-count">{columnRows.length}</span></div><strong>{formatMoney(totalDealValue(columnRows))}</strong></header>
            <div className="deals-column-cards">{columnRows.map((lead) => <article className={`deals-card ${draggedId === lead.id ? "deals-dragging" : ""}`} key={lead.id} draggable={canStage(lead) && !busy && !loading && !error}
              onDragStart={(event) => { if (!canStage(lead) || busy || loading || error) { event.preventDefault(); return; } event.dataTransfer.setData("text/plain", String(lead.id)); event.dataTransfer.effectAllowed = "move"; setDraggedId(lead.id); }} onDragEnd={() => { setDraggedId(null); setDropStage(null); }}>
              <div className="deals-card-top"><span className="deals-card-tag">{lead.industry || "Opportunity"}</span>{canStage(lead) && nextStage(lead) && <button className="deals-icon" aria-label={`Advance ${lead.company || lead.name} to ${nextStage(lead)}`} disabled={busy || loading || !!error} onClick={() => requestStage(lead, nextStage(lead))}><Icon>arrow_forward</Icon></button>}</div>
              <button className="deals-card-title" onClick={() => setSelectedId(lead.id)}><h3>{lead.company || "Company not recorded"}</h3></button><div className="deals-card-contact"><Icon>person</Icon><span>{lead.name}</span></div><div className="deals-card-value">{formatMoney(lead.deal_value)}<span>estimated · USD</span></div>
              <div className="deals-card-activity"><Icon>history</Icon><div><span>{lead.last_activity_at ? latestByLead.get(lead.id)?.title || "Activity recorded" : "No activity recorded"}</span>{lead.last_activity_at && <small>{dateLabel(lead.last_activity_at)}</small>}</div></div>
              <footer><div><span className="deals-avatar">{getLeadInitials(lead.owner_name)}</span><span title={lead.owner_name || "Unassigned"}>{lead.owner_name || "Unassigned"}</span></div><button className="deals-link" aria-label={`View opportunity for ${lead.company || lead.name}`} onClick={() => setSelectedId(lead.id)}>Details<Icon>north_east</Icon></button></footer>
            </article>)}{!columnRows.length && <div className="deals-column-empty">No {column.toLowerCase()} opportunities{can("update_lead_status") ? ". Move a permitted card here or qualify a lead." : "."}</div>}</div>
          </section>;
        })}</div>
        <p className="deals-board-hint"><Icon>info</Icon>{can("update_lead_status") ? "Drag a permitted card to another column or use its stage control. Every move requires confirmation." : "Open any card to inspect its saved details."}</p>
      </> : <section className="deals-list-panel">{tab === "closed" && <div className="deals-closed-header"><div className="deals-closed-tabs" role="group" aria-label="Closed outcomes">{["all", "Won", "Lost"].map((outcome) => <button key={outcome} aria-pressed={closed === outcome} onClick={() => { setClosed(outcome); setStage(""); }}>{outcome === "all" ? "All closed" : outcome} <span>{closedRecords.filter((lead) => outcome === "all" || dealStage(lead) === outcome).length}</span></button>)}</div><div className="deals-won-value"><Icon>verified</Icon><span>Won opportunity value<strong>{formatMoney(totalDealValue(closedRecords.filter((lead) => dealStage(lead) === "Won" && (!stage || dealStage(lead) === stage))))}</strong></span></div></div>}{rows.length ? table : empty}<footer className="deals-table-footer"><span>{rows.length} matching {tab === "closed" ? "closed records" : "open opportunities"}</span><span>Estimated value · USD · {tab === "closed" ? "Won does not mean paid" : "Early leads are shown in Leads"}</span></footer></section>}
    </div>
    <p className="deals-disclaimer">Qualified, Proposal, and Negotiation leads appear as open opportunities. Won/Lost records appear in Closed. Summary cards show account totals; filters apply to the views below. No separate deal, closing-date, or recurring-revenue data is assumed.</p>
    {selected && <DealDrawer key={selected.id} lead={selected} user={user} busy={busy || loading} onClose={() => setSelectedId(null)} onStage={(lead, target) => { if (!error) requestStage(lead, target); }} onSaveNotes={(lead, notes) => error ? Promise.resolve(false) : persist(lead, "notes", notes)} onOpenLead={onOpenLead} revision={revision} activityAvailable={data.activityAvailable} />}
    {confirmation && <DealDialog className="deals-confirm" labelId="deal-confirm-heading" onClose={() => setConfirmation(null)} busy={busy}><div className="deals-confirm-body"><span className="deals-confirm-icon"><Icon>forward</Icon></span><h2 id="deal-confirm-heading">Confirm stage change</h2><p>Review this change before updating the linked lead.</p><dl><div><dt>Opportunity</dt><dd>{data.leads.find((lead) => lead.id === confirmation.leadId)?.company || "Company not recorded"}</dd></div><div><dt>Stage</dt><dd>{confirmation.from} → {confirmation.target}</dd></div><div><dt>Estimated value</dt><dd>{formatMoney(data.leads.find((lead) => lead.id === confirmation.leadId)?.deal_value)}</dd></div></dl><p>{["Won", "Lost"].includes(confirmation.target) ? "This record will move to Closed. This does not record a payment or delete the lead." : ["New Lead", "Contacted"].includes(confirmation.target) ? "This record will return to Leads and leave the active opportunity board." : "The saved stage will update across Deals, Leads, and Dashboard."} No automated emails or tasks will be triggered.</p>{confirmation.error && <p role="alert" className="deals-danger">{confirmation.error}</p>}<div className="deals-actions"><button className="secondary-button" disabled={busy} onClick={() => setConfirmation(null)} autoFocus>Cancel</button><button className="primary-button" disabled={busy || !!error} onClick={confirmStage}>{busy ? "Saving…" : "Confirm stage change"}</button></div></div></DealDialog>}
  </main>;
}
