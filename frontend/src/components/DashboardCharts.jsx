import React, { useId } from "react";
import { PALETTE } from "../utils/dashboard";

export function DonutChart({ groups, center, caption, onSelect }) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  let offset = 0;
  return <div className="dash-donut-layout">
    <div className="dash-donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={`${caption}: ${groups.map((g) => `${g.label} ${g.count}`).join(", ")}`}>
        <circle cx="100" cy="100" r="72" fill="none" stroke="var(--surface-3)" strokeWidth="25" />
        {groups.filter((g) => g.count > 0).map((group, index) => {
          const share = group.count / total * 100;
          const start = offset; offset += share;
          return <circle key={group.key || group.label} cx="100" cy="100" r="72" fill="none"
            stroke={group.color || PALETTE[index % PALETTE.length]} strokeWidth="25" pathLength="100"
            strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 100 100)">
            <title>{group.label}: {group.count} ({(share).toFixed(1)}%)</title>
          </circle>;
        })}
      </svg>
      <div className="dash-donut-center"><strong>{center ?? total}</strong><span>{caption}</span></div>
    </div>
    <div className="dash-legend">{groups.map((group, index) => <button key={group.key || group.label} onClick={() => onSelect?.(group)} disabled={!onSelect}
      aria-label={`Show ${group.label} leads (${group.count})`}>
      <i style={{ background: group.color || PALETTE[index % PALETTE.length] }} /><span>{group.label}</span>
      <b>{group.count.toLocaleString()} <small>{total ? `${Math.round(group.count / total * 100)}%` : "0%"}</small></b>
    </button>)}</div>
  </div>;
}

export function LineChart({ series }) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(1, ...series.map((point) => point.count));
  const ceiling = Math.max(4, Math.ceil(max / 4) * 4);
  const points = series.map((point, index) => [44 + index * 500 / Math.max(1, series.length - 1), 194 - point.count / ceiling * 154]);
  const path = points.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  return <div className="dash-line-chart"><svg viewBox="0 0 575 230" role="img" aria-label={`Leads created: ${series.map((s) => `${s.label}: ${s.count}`).join(", ")}`}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity=".3" /><stop offset="100%" stopColor="#6366f1" stopOpacity=".02" /></linearGradient></defs>
    {[0, 1, 2, 3, 4].map((n) => <g key={n}><line x1="44" x2="544" y1={194 - n * 38.5} y2={194 - n * 38.5} stroke="var(--border)" strokeDasharray="4 5" /><text x="34" y={199 - n * 38.5} textAnchor="end">{ceiling * n / 4}</text></g>)}
    <path d={`${path} L 544 194 L 44 194 Z`} fill={`url(#${id})`} />
    <path d={path} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" />
    {points.map(([x, y], index) => <g key={series[index].start}><circle cx={x} cy={y} r="5" fill="var(--surface)" stroke="#6366f1" strokeWidth="2"><title>{series[index].label}: {series[index].count} leads</title></circle><text x={x} y="220" textAnchor="middle">{series[index].label}</text></g>)}
  </svg></div>;
}

export function BarChart({ groups, field = "value", format = (n) => n.toLocaleString(), onSelect }) {
  const max = Math.max(1, ...groups.map((group) => group[field]));
  return <div className="dash-bars">{groups.map((group, index) => <button className="dash-bar" key={group.key || group.label}
    onClick={() => onSelect?.(group)} disabled={!onSelect} aria-label={`${group.label}: ${format(group[field])}. Show leads`}>
    <b>{format(group[field])}</b><div className="dash-bar-track"><span style={{ height: `${group[field] / max * 100}%`, background: group.color || PALETTE[index % PALETTE.length] }} /></div><span>{group.label}</span>
  </button>)}</div>;
}
