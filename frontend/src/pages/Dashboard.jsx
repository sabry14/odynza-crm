import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { BarChart, DonutChart, LineChart } from "../components/DashboardCharts";
import { getDashboard } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { formatMoney } from "../utils/leads";
import { attentionItems, creationSeries, csvText, groupLeads, isOpen, leadValue, stageGroups, statusOf, summarize, sumValue, teamGroups } from "../utils/dashboard";
import "../dashboard.css";

const TABS = [["overview", "Overview", "dashboard"], ["trends", "Lead Trends", "show_chart"], ["sources", "Sources & Industries", "donut_large"], ["team", "Team Performance", "groups"]];
const compactMoney = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
const dateLabel = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Date not recorded";

function Panel({ title, subtitle, icon, action, children, footer, className = "" }) {
  return <section className={`dash-panel ${className}`}><header><div><h2><Icon>{icon}</Icon>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}{footer && <footer>{footer}</footer>}</section>;
}
function Empty({ children }) { return <div className="dash-empty">{children}</div>; }
function StageBadge({ lead }) {
  const stage = stageGroups([lead]).find((group) => group.count);
  return <span className="dash-stage" style={{ "--stage-color": stage?.color || "#64748b" }}>{statusOf(lead)}</span>;
}
function download(name, headers, rows) {
  const url = URL.createObjectURL(new Blob([csvText(headers, rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard({ onOpenLead, onViewLeads }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("weekly");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [industry, setIndustry] = useState("");
  const [attention, setAttention] = useState("all");
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [drilldown, setDrilldown] = useState(null);
  const resultsRef = useRef(null);
  useEffect(() => {
    if (drilldown) resultsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [drilldown]);

  const load = useCallback(async (signal) => {
    setLoading(true); setError("");
    try {
      const result = await getDashboard(getStoredToken(), signal);
      if (signal?.aborted) return;
      setData(result);
      setDrilldown(null);
      if (!result.canViewTeam) { setOwner(""); setTab((current) => current === "team" ? "overview" : current); }
    } catch (err) { if (err.name !== "AbortError") setError(err.message || "Unable to load dashboard"); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const allLeads = data?.leads || [];
  const owners = useMemo(() => teamGroups(allLeads), [data]);
  const sources = useMemo(() => groupLeads(allLeads, "source"), [data]);
  const industries = useMemo(() => groupLeads(allLeads, "industry"), [data]);
  const leads = useMemo(() => allLeads.filter((lead) =>
    (!owner || String(lead.owner_id ?? "unassigned") === owner) &&
    (!source || (String(lead.source || "").trim().toLowerCase() || "not recorded") === source) &&
    (!industry || (String(lead.industry || "").trim().toLowerCase() || "not recorded") === industry)
  ), [data, owner, source, industry]);
  const metrics = summarize(leads);
  const snapshotTime = data?.generatedAt ? new Date(data.generatedAt) : new Date();
  const series = creationSeries(leads, period, snapshotTime);
  const stages = stageGroups(leads);
  const stageValues = stageGroups(leads, true);
  const sourceGroups = groupLeads(leads, "source");
  const industryGroups = groupLeads(leads, "industry");
  const alerts = attentionItems(leads, snapshotTime);
  const matchingAlerts = alerts.filter((item) => attention === "all" || item.reasons.some((r) => r.type === attention));
  const topLeads = leads.filter(isOpen).sort((a, b) => leadValue(b) - leadValue(a) || Number(a.id) - Number(b.id)).slice(0, 5);
  const visibleIds = new Set(leads.map((lead) => String(lead.id)));
  const activities = (data?.activities || []).filter((activity) => visibleIds.has(String(activity.lead_id)));
  const team = teamGroups(leads);
  const selectStage = (group, onlyOpen = false) => setDrilldown({ title: `${group.label} leads`, leads: leads.filter((lead) => (group.label === "Other stages" ? !stages.some((s) => s.label === statusOf(lead)) : statusOf(lead) === group.label) && (!onlyOpen || isOpen(lead))) });
  const selectGroup = (field) => (group) => setDrilldown({ title: `${group.label} leads`, leads: leads.filter((lead) => (String(lead[field] || "").trim().toLowerCase() || "not recorded") === group.key) });

  const leadTable = (rows) => rows.length ? <div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Lead / Company</th><th>Stage</th><th>Est. value</th>{data.canViewTeam && <th>Owner</th>}<th><span className="dash-sr-only">Action</span></th></tr></thead><tbody>{rows.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><small>{lead.company}</small></td><td><StageBadge lead={lead} /></td><td className="dash-number">{formatMoney(lead.deal_value)}</td>{data.canViewTeam && <td>{lead.owner_name || "Unassigned"}</td>}<td><button className="dash-link" onClick={() => onOpenLead(lead)}>Open lead <Icon>arrow_outward</Icon></button></td></tr>)}</tbody></table></div> : <Empty>No matching lead records.</Empty>;

  if (!data) return <main className="page dashboard-page"><h1>Dashboard</h1>{loading ? <div className="dash-loading" role="status">Loading your dashboard…</div> : <div className="dash-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => load()}>Try again</button></div>}</main>;

  const trendPanel = <Panel title="Leads Created Over Time" subtitle={`${period === "weekly" ? "Last 8 weeks" : "Last 12 months"} · created-date counts · UTC · current period is partial`} icon="show_chart"
    action={<div className="dash-segment" aria-label="Trend interval">{["weekly", "monthly"].map((value) => <button key={value} aria-pressed={period === value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value === "weekly" ? "Weekly" : "Monthly"}</button>)}</div>}
    footer={<><span>{series.reduce((sum, point) => sum + point.count, 0)} leads created in this window</span><span>Not historical stage conversion</span></>}><LineChart series={series} /></Panel>;

  return <main className="page dashboard-page" aria-busy={loading}>
    <div className="dash-heading"><div><div className="eyebrow">ODYNZA CRM</div><h1>Dashboard <span>{data.scope === "personal" ? "My workspace" : "Organization overview"}</span></h1><p>Welcome back, {data.user.full_name?.split(" ")[0] || "there"}. Here’s your pipeline and what needs attention.</p></div>
      <div className="dash-heading-actions"><button className="secondary-button" disabled={loading} onClick={() => load()}><Icon>refresh</Icon>{loading ? "Refreshing…" : "Refresh"}</button><button className="primary-button" disabled={!leads.length || loading} onClick={() => download("odynza-dashboard-leads.csv", ["Lead", "Company", "Stage", "Estimated Value (USD)", "Owner", "Source", "Industry", "Created At"], leads.map((lead) => [lead.name, lead.company, statusOf(lead), lead.deal_value, lead.owner_name, lead.source, lead.industry, lead.created_at]))}><Icon>download</Icon>Export CSV</button></div>
    </div>
    <div className="dash-meta"><span><i className={error ? "dash-dot-error" : ""} />{error ? "Refresh failed · showing last loaded data" : `Updated ${dateLabel(data.generatedAt)}`}</span><span>{data.scope === "personal" ? "Only records assigned to your account" : data.canViewTeam ? "All CRM leads · administrator access" : "All CRM leads · read-only catalog-manager access"}</span></div>
    {error && <div className="dash-error" role="alert">{error} <button className="dash-link" onClick={() => load()}>Retry</button></div>}
    <nav className="dash-tabs" aria-label="Dashboard sections">{TABS.filter(([key]) => key !== "team" || data.canViewTeam).map(([key, label, icon]) => <button key={key} aria-current={tab === key ? "page" : undefined} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setDrilldown(null); }}><Icon>{icon}</Icon>{label}{key === "team" && <small>Admin</small>}</button>)}</nav>
    <div className="dash-filters">
      {data.canViewTeam && <label>Owner<select value={owner} onChange={(e) => { setOwner(e.target.value); setDrilldown(null); }}><option value="">All owners</option>{owners.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label>}
      <label>Source<select value={source} onChange={(e) => { setSource(e.target.value); setDrilldown(null); }}><option value="">All sources</option>{sources.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select></label>
      <label>Industry<select value={industry} onChange={(e) => { setIndustry(e.target.value); setDrilldown(null); }}><option value="">All industries</option>{industries.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select></label>
      <div className="dash-filter-summary">{leads.length.toLocaleString()} of {allLeads.length.toLocaleString()} accessible leads<button className="dash-link" disabled={!owner && !source && !industry} onClick={() => { setOwner(""); setSource(""); setIndustry(""); setDrilldown(null); }}>Reset filters</button></div>
    </div>
    <div className="dash-kpis">
      {[
        ["Active leads", metrics.active.toLocaleString(), "Excludes Won and Lost", "person_search", "#6366f1"],
        ["Open opportunity value", formatMoney(metrics.openValue), "Sum of estimated values · USD", "payments", "#4f46e5"],
        ["Qualified opportunities", metrics.qualified.toLocaleString(), `Qualified, Proposal & Negotiation · ${compactMoney(metrics.qualifiedValue)}`, "verified", "#0ea5e9"],
        ["Closed win rate", metrics.winRate == null ? "—" : `${metrics.winRate.toFixed(1)}%`, `${metrics.won} Won / ${metrics.won + metrics.lost} closed leads`, "emoji_events", "#10b981"],
      ].map(([label, value, description, icon, color]) => <article className="dash-kpi" key={label} style={{ "--kpi-color": color }}><div><span>{label}</span><Icon>{icon}</Icon></div><strong>{value}</strong><p>{description}</p><i /></article>)}
    </div>

    {tab === "overview" && <>
      <div className="dash-chart-grid">
        {trendPanel}
        <Panel title="Current Lead Status" subtitle="Current snapshot across all recorded stages" icon="donut_large" footer={<><span>{metrics.total ? (metrics.active / metrics.total * 100).toFixed(1) : "0.0"}% active</span><span>{metrics.won} Won · {metrics.lost} Lost</span></>}><DonutChart groups={stages} caption="Total leads" onSelect={(g) => selectStage(g)} /></Panel>
        <Panel title="Open Value by Stage" subtitle="Estimated opportunity value · Won / Lost excluded" icon="bar_chart" action={<span className="dash-total">{compactMoney(metrics.openValue)} total</span>} footer={<span>Click a stage to explore its open leads. Estimated value is not collected revenue.</span>}><BarChart groups={stageValues} format={compactMoney} onSelect={(g) => selectStage(g, true)} /></Panel>
        <Panel title="Lead Sources" subtitle="Where your recorded leads came from" icon="hub" footer={<span>{sourceGroups.length} recorded source categories · click the legend to explore</span>}><DonutChart groups={sourceGroups} caption="Total leads" onSelect={selectGroup("source")} /></Panel>
      </div>
      <Panel title="Needs Attention" subtitle="Open leads only · each lead counted once, even with multiple alerts" icon="warning" action={<span className="dash-alert-count">{alerts.length} pending</span>} className="dash-attention">
        <div className="dash-attention-tabs">{[["all", "All"], ["new", "New Leads ≥ 14 Days"], ["idle", "No CRM Update ≥ 7 Days"], ["value", "Missing Est. Value"]].map(([key, label]) => <button key={key} className={attention === key ? "active" : ""} aria-pressed={attention === key} onClick={() => { setAttention(key); setShowAllAttention(false); }}>{label} <b>{key === "all" ? alerts.length : alerts.filter((item) => item.reasons.some((r) => r.type === key)).length}</b></button>)}</div>
        {matchingAlerts.length ? <div className="dash-alert-list">{(showAllAttention ? matchingAlerts : matchingAlerts.slice(0, 5)).map(({ lead, reasons }) => <div className="dash-alert-row" key={lead.id}><span className="dash-alert-icon"><Icon>{reasons.some((r) => r.type === "value") ? "payments" : "schedule"}</Icon></span><div><strong>{lead.company || lead.name}</strong> <StageBadge lead={lead} /><p>{reasons.map((r) => r.text).join(" · ")}</p></div><button className="dash-link" onClick={() => onOpenLead(lead)}>Open lead <Icon>arrow_outward</Icon></button></div>)}{matchingAlerts.length > 5 && <button className="dash-link dash-show-more" onClick={() => setShowAllAttention((value) => !value)}>{showAllAttention ? "Show fewer" : `Show all ${matchingAlerts.length} alerts`}</button>}</div> : <Empty>No leads match this attention rule.</Empty>}
      </Panel>
      <div className="dash-bottom-grid">
        <Panel title="Highest-Value Open Opportunities" subtitle="Top 5 open leads ranked by estimated value" icon="trending_up" action={<button className="dash-link" onClick={onViewLeads}>View all leads <Icon>arrow_forward</Icon></button>} footer={<><span>Showing {topLeads.length} of {metrics.active} open opportunities</span><span>Top 5 total: {formatMoney(sumValue(topLeads))}</span></>}>{leadTable(topLeads)}</Panel>
        <Panel title="Recent CRM Activity" subtitle="Recorded creation, imports, updates, notes and stage changes" icon="history" action={<button className="dash-link" disabled={!activities.length} onClick={() => download("odynza-recent-activity.csv", ["Date", "Actor", "Lead", "Company", "Type", "Title", "Description"], activities.map((a) => [a.created_at, a.actor_name, a.lead_name, a.company, a.activity_type, a.title, a.description]))}>Export activity</button>} footer={<span>Latest {activities.length} matching events from the last 50 accessible events</span>}>
          {!data.activityAvailable ? <Empty>Activity history is unavailable in this database. Lead analytics still work.</Empty> : !activities.length ? <Empty>No recorded activity for these leads yet.</Empty> : <ol className="dash-activity">{activities.slice(0, 6).map((a) => <li key={a.id}><span><Icon>{({ created: "person_add", imported: "upload_file", stage_changed: "swap_horiz", notes_updated: "edit_note" })[a.activity_type] || "edit"}</Icon></span><div><button className="dash-link" onClick={() => { const lead = leads.find((l) => String(l.id) === String(a.lead_id)); if (lead) onOpenLead(lead); }}>{a.title || "CRM activity"}</button><p><b>{a.actor_name || "Actor not recorded"}</b> · {a.company || a.lead_name}</p><p>{a.description}</p><time dateTime={a.created_at}>{dateLabel(a.created_at)}</time></div></li>)}</ol>}
        </Panel>
      </div>
    </>}
    {tab === "trends" && <><div className="dash-chart-grid">{trendPanel}<Panel title="Created Leads by Source" subtitle="All-time creation counts for the currently filtered records" icon="bar_chart"><BarChart groups={sourceGroups} field="count" onSelect={selectGroup("source")} /></Panel></div><div className="dash-note">Trends use lead creation dates only. Historical revenue, closing dates and stage conversion are not inferred from today’s snapshot.</div><Panel title="Creation Counts" icon="calendar_month" subtitle="The same values used by the chart"><div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Period start (UTC)</th><th>Leads created</th></tr></thead><tbody>{series.map((point) => <tr key={point.start}><td>{point.label}</td><td>{point.count}</td></tr>)}</tbody></table></div></Panel></>}
    {tab === "sources" && <><div className="dash-chart-grid"><Panel title="Lead Sources" subtitle="All recorded leads, including closed leads" icon="hub"><DonutChart groups={sourceGroups} caption="Total leads" onSelect={selectGroup("source")} /></Panel><Panel title="Industry Breakdown" subtitle="Distribution by the lead’s recorded industry" icon="business"><DonutChart groups={industryGroups} caption="Total leads" onSelect={selectGroup("industry")} /></Panel></div><Panel title="Source Opportunity Value" subtitle="Open estimated value by source · closed leads excluded" icon="bar_chart"><BarChart groups={sourceGroups} format={compactMoney} onSelect={selectGroup("source")} /></Panel><div className="dash-note">Blank source and industry fields are grouped as “Not recorded”. No source attribution or growth figures are invented.</div></>}
    {tab === "team" && data.canViewTeam && <><Panel title="Team Open Opportunity Value" subtitle="Current open estimated value by assigned owner" icon="groups"><BarChart groups={team.map((g) => ({ ...g, value: g.openValue }))} format={compactMoney} onSelect={(g) => setDrilldown({ title: `${g.label}’s leads`, leads: g.leads })} /></Panel><Panel title="Owner Comparison" subtitle="Admins only · owners with accessible lead records, including unassigned leads" icon="leaderboard"><div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Owner</th><th>Active</th><th>Qualified</th><th>Open value</th><th>Won</th><th>Lost</th><th>Win rate</th></tr></thead><tbody>{team.map((g) => <tr key={g.key}><td><button className="dash-link" onClick={() => setDrilldown({ title: `${g.label}’s leads`, leads: g.leads })}>{g.label}</button></td><td>{g.active}</td><td>{g.qualified}</td><td>{formatMoney(g.openValue)}</td><td>{g.won}</td><td>{g.lost}</td><td>{g.winRate == null ? "—" : `${g.winRate.toFixed(1)}%`}</td></tr>)}</tbody></table></div>{!team.length && <Empty>No assigned lead records yet.</Empty>}</Panel></>}
    {drilldown && <div ref={resultsRef} className="dash-results" aria-live="polite"><Panel title={drilldown.title} subtitle={`${drilldown.leads.length} matching records`} icon="manage_search" action={<button className="dash-link" onClick={() => setDrilldown(null)}>Close results <Icon>close</Icon></button>}>{leadTable(drilldown.leads)}</Panel></div>}
    <p className="dash-disclaimer">Current CRM snapshot · currency follows the existing USD deal-value field · refresh to load the latest saved changes.</p>
  </main>;
}
