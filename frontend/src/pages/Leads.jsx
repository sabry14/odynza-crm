import React, { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { getLeads } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { formatMoney, getLeadInitials, mapLead } from "../utils/leads";

export default function Leads({ onOpenLead }) {
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        setError("");

        const token = getStoredToken();

        if (!token) {
          throw new Error("You are not signed in.");
        }

        const data = await getLeads(token);
        setLeads((data.leads || []).map(mapLead));
      } catch (err) {
        setError(err.message || "Unable to load leads");
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    if (!q) return leads;

    return leads.filter((lead) =>
      `${lead.name || ""} ${lead.company || ""} ${lead.email || ""} ${
        lead.domain || ""
      } ${lead.status || ""} ${lead.owner || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, leads]);

  const totalActive = leads.filter(
    (lead) => !["Won", "Lost"].includes(lead.status)
  ).length;

  const qualified = leads.filter(
    (lead) =>
      ["Qualified", "Proposal", "Negotiation"].includes(lead.status)
  ).length;

  const pipelineValue = leads
    .filter((lead) => !["Won", "Lost"].includes(lead.status))
    .reduce((sum, lead) => sum + (Number(lead.deal_value) || 0), 0);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <span /> LEAD MANAGEMENT <b>•</b> {leads.length} TOTAL
          </div>
          <h1>Leads</h1>
          <p>
            Monitor pipeline health, prioritize high-value prospects, and
            accelerate initial touchpoints.
          </p>
        </div>

        <button className="primary-button">
          <Icon>person_add</Icon> Add Lead
        </button>
      </div>

      <div className="metric-grid">
        {[
          ["Total Active Leads", totalActive, "Current account", "groups"],
          ["Qualified Opportunities", qualified, "Qualified / proposal / negotiation", "verified"],
          ["Pipeline Value", formatMoney(pipelineValue), "Active pipeline", "trending_up"],
          ["Visible Leads", leads.length, "Based on your permissions", "visibility"]
        ].map(([title, value, sub, icon]) => (
          <div className="metric-card" key={title}>
            <div className="metric-top">
              <span>{title}</span>
              <Icon>{icon}</Icon>
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="input-wrap">
            <Icon>search</Icon>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by lead name, company, email, or domain..."
            />
          </div>

          <button className="secondary-button">
            <Icon>view_column</Icon> Columns
          </button>

          <button className="secondary-button">
            <Icon>tune</Icon> Filters
          </button>
        </div>

        {loading && (
          <div style={{ padding: "24px" }}>
            Loading leads...
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: "24px" }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Deal Value</th>
                  <th>Lead Owner</th>
                  <th>Source</th>
                  <th>Last Touch</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onOpenLead && onOpenLead(lead)}
                  >
                    <td>
                      <div className="lead-cell">
                        <div className="mini-avatar">
{getLeadInitials(lead.name)}
                        </div>

                        <div>
                          <strong>{lead.name}</strong>
                          <small>{lead.role}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {lead.company}
                      <small>{lead.location}</small>
                    </td>

                    <td>
                      <span
                        className={`status ${lead.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="value">{lead.value}</td>
                    <td>{lead.owner}</td>
                    <td>{lead.source}</td>
                    <td>{lead.lastTouch}</td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
