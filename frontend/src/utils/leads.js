export function formatMoney(value) {
  if (value === null || value === undefined) return "—";

  const number = Number(value);
  if (Number.isNaN(number)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

export function mapLead(lead) {
  return {
    ...lead,
    role: lead.role || "—",
    location: lead.location || "—",
    owner: lead.owner_name || "Unassigned",
    source: lead.source || "—",
    lastTouch: lead.last_touch || "—",
    value: formatMoney(lead.deal_value),
    status: lead.status || "New Lead",
  };
}

export function getLeadInitials(name) {
  return (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
