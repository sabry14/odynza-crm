import React from "react";
import Icon from "./Icon";

const items = [
  ["dashboard", "Dashboard", "grid_view"],
  ["leads", "Leads", "filter_list"],
  ["deals", "Deals", "monetization_on"],
  ["catalog", "Catalog", "category"],
];

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>Odynza CRM</strong>
            <small>Enterprise Core</small>
          </div>
        </div>

        <div className="side-section">
          <div className="side-label">Operations</div>
          {items.map(([id, label, icon]) => (
            <button
              key={id}
              className={`side-item ${page === id || (id === "leads" && page === "lead-details") || (id === "catalog" && page === "talent-acquisition") ? "active" : ""}`}
              onClick={() => onNavigate(id === "dashboard" ? "leads" : id)}
            >
              <Icon>{icon}</Icon>
              <span>{label}</span>
            </button>
          ))}
        </div>

      </div>

      <div className="side-bottom">
        <button className="side-item">
          <Icon>settings</Icon>
          <span>Settings</span>
        </button>
        <div className="health-card">
          <span className="health-dot" />
          <div>
            <strong>US-East-1 Prod</strong>
            <small>99.98% Healthy</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
