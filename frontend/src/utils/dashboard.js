export const STAGES = [
  ["New Lead", "#38bdf8"], ["Contacted", "#4f46e5"], ["Qualified", "#8b5cf6"],
  ["Proposal", "#f59e0b"], ["Negotiation", "#f97316"], ["Won", "#10b981"], ["Lost", "#64748b"],
];
export const PALETTE = ["#4f46e5", "#38bdf8", "#14b8a6", "#f59e0b", "#8b5cf6", "#f97316", "#64748b"];
const DAY = 86400000;
export const statusOf = (lead) => ({ "Closed Won": "Won", "Closed Lost": "Lost" }[lead.status] || lead.status || "Not recorded");
export const isOpen = (lead) => !["Won", "Lost"].includes(statusOf(lead));
export const leadValue = (lead) => Math.max(0, Number(lead.deal_value) || 0);
export const sumValue = (leads) => leads.reduce((total, lead) => total + leadValue(lead), 0);
const dateValue = (value) => value ? new Date(value).getTime() : NaN;

export function summarize(leads) {
  const open = leads.filter(isOpen);
  const qualified = open.filter((l) => ["Qualified", "Proposal", "Negotiation"].includes(statusOf(l)));
  const won = leads.filter((l) => statusOf(l) === "Won");
  const lost = leads.filter((l) => statusOf(l) === "Lost");
  return { total: leads.length, active: open.length, openValue: sumValue(open), qualified: qualified.length,
    qualifiedValue: sumValue(qualified), won: won.length, lost: lost.length, wonValue: sumValue(won),
    winRate: won.length + lost.length ? won.length / (won.length + lost.length) * 100 : null };
}

export function groupLeads(leads, field) {
  const groups = new Map();
  leads.forEach((lead) => {
    const label = String(lead[field] || "").trim() || "Not recorded";
    const key = label.toLowerCase();
    const current = groups.get(key) || { key, label, count: 0, value: 0 };
    current.count += 1;
    if (isOpen(lead)) current.value += leadValue(lead);
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function stageGroups(leads, values = false) {
  const stages = STAGES.map(([label, color]) => {
    const matches = leads.filter((lead) => statusOf(lead) === label);
    return { label, key: label, color, count: matches.length, value: sumValue(matches) };
  });
  const unknown = leads.filter((lead) => !STAGES.some(([label]) => label === statusOf(lead)));
  if (unknown.length) stages.push({ label: "Other stages", key: "Other stages", color: "#a1a1aa", count: unknown.length, value: sumValue(unknown) });
  return values ? stages.filter((g) => !["Won", "Lost"].includes(g.label)) : stages;
}

export function creationSeries(leads, period, now = new Date()) {
  // UTC bucket boundaries keep charts consistent between server and browsers.
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  if (period === "monthly") end.setUTCDate(1);
  else end.setUTCDate(end.getUTCDate() - (end.getUTCDay() + 6) % 7);
  const length = period === "monthly" ? 12 : 8;
  const buckets = Array.from({ length }, (_, index) => {
    const start = new Date(end);
    if (period === "monthly") start.setUTCMonth(start.getUTCMonth() - (length - 1 - index));
    else start.setUTCDate(start.getUTCDate() - 7 * (length - 1 - index));
    const stop = new Date(start);
    if (period === "monthly") stop.setUTCMonth(stop.getUTCMonth() + 1);
    else stop.setUTCDate(stop.getUTCDate() + 7);
    return { start: start.getTime(), stop: stop.getTime(), label: start.toLocaleDateString("en-US", {
      timeZone: "UTC", month: "short", ...(period === "monthly" ? { year: "2-digit" } : { day: "numeric" }),
    }), count: 0 };
  });
  leads.forEach((lead) => {
    const timestamp = dateValue(lead.created_at);
    if (timestamp > new Date(now).getTime()) return;
    const bucket = buckets.find((b) => timestamp >= b.start && timestamp < b.stop);
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

export function attentionItems(leads, now = new Date()) {
  return leads.filter(isOpen).map((lead) => {
    const reasons = [];
    const created = dateValue(lead.created_at);
    const timestamps = [lead.created_at, lead.updated_at, lead.last_activity_at].map(dateValue).filter(Number.isFinite);
    const last = timestamps.length ? Math.max(...timestamps) : NaN;
    const age = Math.max(0, Math.floor((new Date(now).getTime() - created) / DAY));
    const idle = Math.max(0, Math.floor((new Date(now).getTime() - last) / DAY));
    if (statusOf(lead) === "New Lead" && age >= 14) reasons.push({ type: "new", text: `New lead created ${age} days ago` });
    if (idle >= 7) reasons.push({ type: "idle", text: `No recorded CRM update for ${idle} days` });
    if (["Qualified", "Proposal", "Negotiation"].includes(statusOf(lead)) && !leadValue(lead)) reasons.push({ type: "value", text: "Missing estimated opportunity value" });
    return { lead, reasons, idle };
  }).filter((item) => item.reasons.length).sort((a, b) => b.idle - a.idle || Number(a.lead.id) - Number(b.lead.id));
}

export function teamGroups(leads) {
  const groups = new Map();
  leads.forEach((lead) => {
    const key = lead.owner_id == null ? "unassigned" : String(lead.owner_id);
    const group = groups.get(key) || { key, label: lead.owner_name || "Unassigned", leads: [] };
    group.leads.push(lead);
    groups.set(key, group);
  });
  return [...groups.values()].map((g) => ({ ...g, ...summarize(g.leads) })).sort((a, b) => b.openValue - a.openValue || a.label.localeCompare(b.label));
}

export function csvText(headers, rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; // Avoid spreadsheet formula execution.
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
