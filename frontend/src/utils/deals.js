import { canManageLeadRecord, hasPermission } from "./permissions.js";

export const OPEN_DEAL_STAGES = ["Qualified", "Proposal", "Negotiation"];
export const CLOSED_DEAL_STAGES = ["Won", "Lost"];
export const ALL_LEAD_STAGES = ["New Lead", "Contacted", ...OPEN_DEAL_STAGES, ...CLOSED_DEAL_STAGES];
export const DEAL_COLORS = { Qualified: "#7c3aed", Proposal: "#0284c7", Negotiation: "#d97706", Won: "#059669", Lost: "#dc2626" };
export const dealStage = (lead) => ({ "Closed Won": "Won", "Closed Lost": "Lost" }[lead.status] || lead.status);
export const isOpenDeal = (lead) => OPEN_DEAL_STAGES.includes(dealStage(lead));
export const isClosedDeal = (lead) => CLOSED_DEAL_STAGES.includes(dealStage(lead));
export const dealValue = (lead) => Number.isFinite(Number(lead.deal_value)) ? Math.max(0, Number(lead.deal_value)) : 0;
export const totalDealValue = (leads) => leads.reduce((sum, lead) => sum + dealValue(lead), 0);
export const opportunityRecords = (leads) => leads.filter((lead) => isOpenDeal(lead) || isClosedDeal(lead));

export function dealSummary(leads) {
  const open = leads.filter(isOpenDeal);
  const negotiating = open.filter((lead) => dealStage(lead) === "Negotiation");
  const value = totalDealValue(open);
  return { open: open.length, value, average: open.length ? value / open.length : 0,
    negotiating: negotiating.length, negotiationValue: totalDealValue(negotiating),
    negotiationShare: value > 0 ? totalDealValue(negotiating) / value * 100 : null };
}

export function filterDeals(leads, { query = "", owner = "", stage = "", closed = "all", view = "board" } = {}) {
  const text = query.trim().toLocaleLowerCase();
  return leads.filter((lead) =>
    (view === "closed" ? isClosedDeal(lead) : isOpenDeal(lead)) &&
    (!text || [lead.company, lead.name, lead.email, lead.domain].some((field) => String(field || "").toLocaleLowerCase().includes(text))) &&
    (!owner || String(lead.owner_id ?? "unassigned") === owner) &&
    (!stage || dealStage(lead) === stage) &&
    (view !== "closed" || closed === "all" || dealStage(lead) === closed)
  );
}

export function sortDeals(leads, field = "deal_value", direction = "desc") {
  const factor = direction === "asc" ? 1 : -1;
  return [...leads].sort((a, b) => {
    if (field === "last_activity_at") {
      const left = a.last_activity_at ? Date.parse(a.last_activity_at) : NaN;
      const right = b.last_activity_at ? Date.parse(b.last_activity_at) : NaN;
      if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.isFinite(left) ? -1 : Number.isFinite(right) ? 1 : Number(a.id) - Number(b.id);
      return (left - right) * factor || Number(a.id) - Number(b.id);
    }
    const result = field === "deal_value" ? dealValue(a) - dealValue(b) :
      String(field === "status" ? dealStage(a) : a[field] || "").localeCompare(String(field === "status" ? dealStage(b) : b[field] || ""), undefined, { sensitivity: "base" });
    return result * factor || Number(a.id) - Number(b.id);
  });
}

export function canUpdateDeal(user, lead, permission) {
  return canManageLeadRecord(user, lead) && hasPermission(user, permission);
}

// Send only the affected field, so stage and note permissions stay independent.
export function dealPatch(user, lead, kind, value) {
  if (!lead?.id || !["status", "notes"].includes(kind)) throw new Error("Invalid opportunity change");
  const permission = kind === "status" ? "update_lead_status" : "add_lead_notes";
  if (!canUpdateDeal(user, lead, permission)) throw new Error("You do not have permission to make this change");
  if (kind === "status" && !ALL_LEAD_STAGES.includes(value)) throw new Error("Invalid opportunity stage");
  if (kind === "notes" && typeof value !== "string") throw new Error("Notes must be text");
  return { [kind]: value };
}
