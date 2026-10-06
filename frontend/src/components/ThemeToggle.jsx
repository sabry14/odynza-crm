import React from "react";
import Icon from "./Icon";

export default function ThemeToggle({ dark, setDark, className = "theme-toggle" }) {
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button type="button" className={className} aria-label={label} title={label} aria-pressed={dark} onClick={() => setDark((current) => !current)}>
      <Icon>{dark ? "light_mode" : "dark_mode"}</Icon>
    </button>
  );
}
