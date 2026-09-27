import React, { useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { agents } from "../data/agents";

const wrap = (n, total) => (n + total) % total;

export default function Catalog() {
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const dragX = useRef(0);
  const didDrag = useRef(false);

  const filtered = useMemo(() => agents.filter(a => {
    const matchesCategory = category === "All" || a.category === category;
    const q = query.toLowerCase();
    return matchesCategory && `${a.name} ${a.headline} ${a.category} ${a.tags.join(" ")}`.toLowerCase().includes(q);
  }), [category, query]);

  const go = (dir) => setActive(v => wrap(v + dir, agents.length));

  // Clicking any visible side/back card makes that card the centered first card.
  const selectCard = (index) => setActive(index);

  const onPointerDown = e => {
    if (e.target.closest("button")) return;
    setDragging(true);
    startX.current = e.clientX;
    dragX.current = 0;
    didDrag.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    if (!dragging) return;
    dragX.current = e.clientX - startX.current;
    if (Math.abs(dragX.current) > 8) didDrag.current = true;
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);

    const dx = dragX.current;
    if (Math.abs(dx) > 45) {
      go(dx < 0 ? 1 : -1);
    }

    dragX.current = 0;
  };

  const onPointerCancel = onPointerUp;

  return (
    <main className="page catalog-page">
      <div className="page-header">
        <div>
          <div className="eyebrow"><span /> AI CATALOG <b>•</b> v4.2 PRODUCTION READY</div>
          <h1>Catalog</h1>
          <p>Discover, benchmark, and deploy autonomous cognitive agents directly into your CRM pipelines.</p>
        </div>
        <div className="button-row"><button className="primary-button"><Icon>add</Icon> Register Agent</button><button className="secondary-button"><Icon>tune</Icon> Fleet Health</button></div>
      </div>

      <div className="catalog-tools">
        <div className="input-wrap"><Icon>search</Icon><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search agents, abilities, or models..." /></div>
        <div className="filter-pills">
          {["All", "People", "Finance", "Sales", "Operations", "Customer Support"].map(c => <button key={c} className={category === c ? "selected" : ""} onClick={() => {setCategory(c); const idx = c === "All" ? 0 : agents.findIndex(a => a.category === c); if (idx >= 0) setActive(idx)}}>{c === "All" ? "All Agents" : c}</button>)}
        </div>
      </div>

      <section className="catalog-section">
        <div className="catalog-heading"><div><h2><Icon>auto_awesome</Icon> Featured Sovereign Agents</h2><span>High Concurrency</span></div></div>

        <div
          className={`carousel-viewport ${dragging ? "dragging" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <button className="carousel-side-arrow carousel-side-arrow-left" aria-label="Previous agent" onClick={() => go(-1)}><Icon>chevron_left</Icon></button>
          <button className="carousel-side-arrow carousel-side-arrow-right" aria-label="Next agent" onClick={() => go(1)}><Icon>chevron_right</Icon></button>

          {agents.map((agent, index) => {
            let diff = index - active;
            if (diff > agents.length / 2) diff -= agents.length;
            if (diff < -agents.length / 2) diff += agents.length;
            if (Math.abs(diff) > 2) return null;
            const isActive = diff === 0;
            return (
              <article
                key={agent.id}
                className={`catalog-card ${isActive ? "focused" : "clickable-back"}`}
                style={{
                  transform: `translateX(${diff * 220}px) translateZ(${-Math.abs(diff) * 120}px) rotateY(${diff * -14}deg) scale(${1 - Math.abs(diff) * 0.12})`,
                  opacity: 1 - Math.abs(diff) * 0.28,
                  zIndex: 30 - Math.abs(diff) * 10
                }}
                onClick={() => {
                  // Ignore only a real drag; a normal click on a back card selects it.
                  if (didDrag.current) {
                    didDrag.current = false;
                    return;
                  }
                  if (!isActive) {
                    selectCard(index);
                    return;
                  }
                  setDrawer(agent);
                }}
                title={isActive ? "Open agent details" : "Click to bring this agent to the front"}
              >
                <div className="agent-card-top"><div className="agent-icon"><Icon>{agent.icon}</Icon></div><span>{agent.category}</span><i>●</i></div>
                <h3>{agent.name}</h3>
                <p>{agent.headline}</p>
                <div className="tag-row">{agent.tags.map(t => <span key={t}>{t}</span>)}</div>
                <div className="agent-stats"><span><b>{agent.accuracy}</b> accuracy</span><span><b>{agent.latency}</b> latency</span></div>
                <button className="card-action">View agent <Icon>arrow_forward</Icon></button>
              </article>
            );
          })}
        </div>
        <div className="swipe-hint"><Icon>swipe</Icon> Swipe left/right or drag to browse</div>
        <div className="carousel-dots">{agents.map((a,i) => <button key={a.id} className={i === active ? "active" : ""} onClick={() => setActive(i)} />)}</div>
      </section>

      <section className="catalog-section">
        <div className="section-title"><div><h2>Available Agent Fleet</h2><p>{filtered.length} agents matching your filters</p></div></div>
        <div className="agent-grid">{filtered.map(agent => <button className="agent-list-card" key={agent.id} onClick={() => setDrawer(agent)}><div className="agent-icon"><Icon>{agent.icon}</Icon></div><div><h3>{agent.name}</h3><p>{agent.headline}</p><small>{agent.category} · {agent.accuracy} accuracy · {agent.latency}</small></div><Icon>chevron_right</Icon></button>)}</div>
      </section>

      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(null)}><aside className="agent-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><span>{drawer.category}</span><button onClick={() => setDrawer(null)}><Icon>close</Icon></button></div><div className="drawer-body"><div className="drawer-title"><div className="agent-icon big"><Icon>{drawer.icon}</Icon></div><div><h2>{drawer.name}</h2><p>{drawer.headline}</p><small>{drawer.latency} latency · {drawer.accuracy} benchmark</small></div></div><div className="drawer-callout"><b>Business Impact & ROI</b><p>Reduces manual validation hours while maintaining reliable enterprise audit traces.</p></div><h3>Operational Capabilities</h3><div className="capability-grid">{drawer.capabilities.map(c => <div key={c}><Icon>check_circle</Icon>{c}</div>)}</div><h3>Cognitive Stack Specifications</h3><div className="spec-grid"><div><small>Base Model</small><b>{drawer.model}</b></div><div><small>Context Window</small><b>{drawer.context}</b></div><div><small>Latency</small><b>{drawer.latency}</b></div><div><small>Unit Cost</small><b>{drawer.cost}</b></div></div></div></aside></div>}
    </main>
  );
}
