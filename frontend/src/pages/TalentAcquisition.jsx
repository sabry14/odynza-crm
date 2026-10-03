import React, { useState } from "react";
import Icon from "../components/Icon";

const capabilities = [
  ["description", "CV Intelligence", "Extract skills, seniority, and experience from every submitted CV."],
  ["fact_check", "Evidence-based matching", "Score candidates against a role using transparent matching signals."],
  ["groups", "Recruiter workspace", "Turn candidate lists into a focused, ranked hiring pipeline."],
  ["integration_instructions", "ATS-ready workflows", "Keep screening outcomes connected to the tools your team already uses."],
];

export default function TalentAcquisition({ agent, onBack }) {
  const [proposalAdded, setProposalAdded] = useState(false);
  const product = agent || { name: "TalentScreen AI", category: "Talent Acquisition & HR Tech", headline: "Autonomous talent intelligence that turns high-volume CVs into qualified, explainable shortlists.", icon: "person_search", accuracy: "98.7%", latency: "330ms", capabilities: capabilities.map(([, title]) => title) };
  const productCapabilities = product.capabilities?.length ? product.capabilities : capabilities.map(([, title]) => title);

  return <main className="page talent-page">
    <div className="talent-breadcrumb"><button className="back-button" onClick={onBack}><Icon>arrow_back</Icon> Back to Catalog</button><span>Catalog / {product.category} / {product.name}</span><b><i /> Official certified module</b></div>
    <section className="talent-hero panel">
      <div className="talent-art"><div className="talent-grid" /><div className="talent-orbit orbit-a" /><div className="talent-orbit orbit-b" /><div className="talent-stream"><Icon>description</Icon><div><small>LIVE AGENT SIGNALS</small><strong>Enterprise workflow ready</strong></div><em>{product.accuracy} benchmark accuracy</em></div><div className="talent-core"><Icon>{product.icon}</Icon><strong>{product.name}</strong><span>AI MODULE</span></div><div className="talent-signal signal-one">{productCapabilities[0]}</div><div className="talent-signal signal-two">{product.latency} latency</div></div>
      <div className="talent-copy"><div className="talent-icon"><Icon>{product.icon}</Icon></div><div><div className="eyebrow">{product.category}</div><h1>{product.name}</h1><p>{product.headline}</p></div><div className="talent-actions"><button className="primary-button" onClick={() => setProposalAdded(true)}><Icon>{proposalAdded ? "check" : "post_add"}</Icon>{proposalAdded ? "Added to proposal" : "Add to Proposal"}</button><button className="secondary-button"><Icon>play_circle</Icon> Watch overview</button></div></div>
    </section>
    <section className="talent-metrics">{[[product.accuracy, "Benchmark accuracy"], [product.latency, "Average latency"], [product.context || "Enterprise", "Context capacity"], [product.cost || "Usage based", "Unit cost"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
    <section className="talent-section panel"><div className="section-title"><div><div className="eyebrow">PRODUCT CAPABILITIES</div><h2>Designed for enterprise workflows</h2><p>Explore the capabilities, model specifications, and operational details for this AI module.</p></div></div><div className="talent-cap-grid">{productCapabilities.map((title, index) => <article key={title}><span><Icon>{capabilities[index % capabilities.length][0]}</Icon></span><h3>{title}</h3><p>{capabilities[index % capabilities.length][2]}</p><button>Explore capability <Icon>arrow_forward</Icon></button></article>)}</div></section>
    <section className="talent-workflow panel"><div><div className="eyebrow">HOW IT WORKS</div><h2>From CV intake to confident shortlist</h2><p>TalentScreen gives recruiters a unified, auditable flow from sourcing through interview readiness.</p></div><ol>{[["01", "Ingest", "Bring resumes and role requirements together."], ["02", "Understand", "Extract verified skills and career signals."], ["03", "Rank", "Compare candidates against the job criteria."], ["04", "Act", "Share a focused shortlist with hiring teams."]].map(([number, title, text]) => <li key={number}><b>{number}</b><div><strong>{title}</strong><span>{text}</span></div></li>)}</ol></section>
  </main>;
}
