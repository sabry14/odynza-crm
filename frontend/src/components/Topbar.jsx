import React from "react";
import Icon from "./Icon";

function getStoredUser() {
  const user =
    localStorage.getItem("odynza_user") ||
    sessionStorage.getItem("odynza_user");

  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export default function Topbar({ dark, setDark }) {
  const user = getStoredUser();

  const userName = user?.full_name || user?.name || "User";

  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleName = user?.role
    ? user.role.replace(/_/g, " ")
    : "User";

  return (
    <header className="topbar">
      <div className="global-search">
        <Icon>search</Icon>
        <input placeholder="Search deals, contacts, pipeline stages, or agents..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="top-actions">
        <div className="live-sync">
          <span /> LIVE SYNC
        </div>

        <button
          className="icon-button"
          aria-label="Theme"
          onClick={() => setDark(!dark)}
        >
          <Icon>{dark ? "light_mode" : "dark_mode"}</Icon>
        </button>

        <button className="icon-button">
          <Icon>notifications</Icon>
          <i className="notification-dot" />
        </button>

        <div className="profile">
          <div>
            <strong>{userName}</strong>
            <small>{roleName}</small>
          </div>

          <div className="avatar">{initials}</div>
        </div>
      </div>
    </header>
  );
}