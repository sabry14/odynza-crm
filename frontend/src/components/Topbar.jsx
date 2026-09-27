import React from "react";
import Icon from "./Icon";

export default function Topbar({ dark, setDark }) {
  return (
    <header className="topbar">
      <div className="global-search">
        <Icon>search</Icon>
        <input placeholder="Search deals, contacts, pipeline stages, or agents..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="top-actions">
        <div className="live-sync"><span /> LIVE SYNC</div>
        <button className="icon-button" aria-label="Theme" onClick={() => setDark(!dark)}>
          <Icon>{dark ? "light_mode" : "dark_mode"}</Icon>
        </button>
        <button className="icon-button">
          <Icon>notifications</Icon>
          <i className="notification-dot" />
        </button>
        <div className="profile">
          <div>
            <strong>Sarah Jenkins</strong>
            <small>VP of Global Sales</small>
          </div>
          <div className="avatar">SJ</div>
        </div>
      </div>
    </header>
  );
}
