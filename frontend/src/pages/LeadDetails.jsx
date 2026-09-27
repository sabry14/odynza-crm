import React, { useState } from "react";
import Icon from "../components/Icon";

const stages = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
];

export default function LeadDetails({ lead, onBack }) {
  const current = Math.max(
    0,
    stages.indexOf(lead?.status || "New Lead")
  );
  const [preview, setPreview] = useState(current);

  if (!lead) return null;

  const initials = (lead.name || "?")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

  const requirements = Array.isArray(lead.requirements)
    ? lead.requirements
    : [];

  const score =
    lead.score ?? lead.lead_score ?? "—";

  const probability =
    lead.probability ?? lead.win_probability ?? "—";

  const value =
    lead.value ??
    (lead.deal_value != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(Number(lead.deal_value))
      : "—");

  const source = lead.source || "—";
  const role = lead.role || "—";
  const location = lead.location || "—";
  const owner = lead.owner || lead.owner_name || "Unassigned";

  return (
    <main className="page">
      <button className="back-button" onClick={onBack}>
        <Icon>arrow_back</Icon> Leads
      </button>

      <section className="lead-hero panel">
        <div className="lead-identity">
          <div className="hero-avatar">{initials}</div>

          <div>
            <div className="chip-row">
              <span className="chip purple">Enterprise Tier</span>
              <span className="chip blue">{source}</span>
              <span className="chip red">
                Lead Score: {score}/100
              </span>
            </div>

            <h1>{lead.name}</h1>

            <p>
              {role} <b>•</b>{" "}
              <span className="accent">{lead.company}</span>{" "}
              <b>•</b> {location}
            </p>
          </div>
        </div>

        <div className="financial">
          <div>
            <small>ESTIMATED PIPELINE VALUE</small>
            <strong>{value}</strong>
            <span>ARR</span>
          </div>

          <div className="divider" />

          <div>
            <small>WIN PROBABILITY</small>
            <strong>{probability}%</strong>
            <span>↗ Stage Velocity +12%</span>
          </div>
        </div>
      </section>

      <section className="panel pipeline-panel">
        <div className="section-title">
          <div>
            <div className="eyebrow">LIFECYCLE & PIPELINE STAGE</div>
            <h2>Deal progression</h2>
          </div>
          <span className="live-pill">● Live</span>
        </div>

        <div className="pipeline">
          {stages.map((stage, i) => {
            const done = i < current;
            const active = i === current;
            const previewing = i === preview;

            return (
              <button
                key={stage}
                className={`stage-card ${done ? "done" : ""} ${
                  active ? "current" : ""
                } ${previewing && !active ? "preview" : ""}`}
                onClick={() => setPreview(i)}
              >
                <div>
                  <span>
                    {String(i + 1).padStart(2, "0")}. {stage}
                  </span>

                  <Icon>
                    {done
                      ? "check_circle"
                      : active
                      ? "radio_button_checked"
                      : "radio_button_unchecked"}
                  </Icon>
                </div>

                <strong>
                  {done
                    ? "Completed"
                    : active
                    ? "In Progress"
                    : previewing
                    ? "Preview"
                    : "Upcoming"}
                </strong>

                <div className="stage-bar">
                  <i
                    style={{
                      width: done
                        ? "100%"
                        : active
                        ? "75%"
                        : previewing
                        ? "35%"
                        : "0%",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pipeline-hint">
          Click a stage to preview it. Previewing never changes the actual
          current stage.
        </div>
      </section>

      <div className="details-grid">
        <section className="panel activity">
          <div className="tabs">
            <span className="active">Activity Feed</span>
            <span>Notes</span>
            <span>Tasks</span>
            <span>Emails</span>
            <span>Files & Architecture</span>
          </div>

          <div className="activity-body">
            <div className="section-title">
              <div>
                <h2>Recent Activity</h2>
                <p>Latest touchpoints and engagement history</p>
              </div>

              <button className="secondary-button">
                <Icon>add</Icon> Add Activity
              </button>
            </div>

            {[
              [
                "Lead Loaded",
                `${lead.name} is currently in the ${lead.status || "New Lead"} stage.`,
                "Just now",
              ],
              [
                "Lead Assigned",
                `${owner} is the current lead owner.`,
                "Current",
              ],
            ].map(([title, text, time]) => (
              <div className="activity-row" key={title}>
                <span className="activity-dot" />

                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>

                <time>{time}</time>
              </div>
            ))}
          </div>
        </section>

        <aside className="side-stack">
          <div className="panel info-card">
            <h3>
              <Icon>target</Icon> Technical Requirements
            </h3>

            {requirements.length > 0 ? (
              requirements.map((x) => (
                <p key={x}>
                  <Icon>check_circle</Icon>
                  {x}
                </p>
              ))
            ) : (
              <p>
                <Icon>info</Icon>
                No requirements recorded yet.
              </p>
            )}
          </div>

          <div className="panel info-card">
            <h3>
              <Icon>note</Icon> Account Notes
            </h3>
            <p>
              No account notes have been recorded for this lead yet.
            </p>
          </div>

          <div className="panel info-card">
            <h3>
              <Icon>person</Icon> Lead Owner
            </h3>
            <p>
              <strong>{owner}</strong>
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
