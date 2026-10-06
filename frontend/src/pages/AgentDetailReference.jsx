import React, { useState } from "react";
import Icon from "../components/Icon";
import AgentLogo from "../components/AgentLogo";
import { agents } from "../data/agents";

export default function AgentDetailReference({ agent, onBack }) {
  const [added, setAdded] = useState(false);
  const product = agent || agents[0];
  const features = product.capabilities;
  const availability = product.comingSoon ? "Coming Soon" : product.status;
  const officialAction = product.useNowLink ? "Open CV Agent" : "View on Odynza";
  const officialUrl = product.useNowLink || product.sourceUrl;

  const actions = <>
    <a className="primary-button" href={officialUrl} target="_blank" rel="noreferrer"><Icon>open_in_new</Icon>{officialAction}</a>
    <button className="secondary-button" onClick={() => setAdded(true)}><Icon>{added ? "check" : "post_add"}</Icon>{added ? "Added" : "Add to Proposal"}</button>
  </>;

  return (
    <main className="reference-detail-page">
      <div className="reference-detail-top">
        <button className="back-button" onClick={onBack}><Icon>arrow_back</Icon> Back to Catalog</button>
        <span>Catalog / {product.category} / {product.name}</span>
      </div>
      <section className="reference-product-card">
        <div className="reference-hero-art" role="img" aria-label={`${product.name} capability illustration`}>
          <div className="product-ambient ambient-one" /><div className="product-ambient ambient-two" />
          <div className="product-grid" /><div className="product-flow flow-one" /><div className="product-flow flow-two" />
          <div className="product-particle particle-a" /><div className="product-particle particle-b" />
          <div className="product-console">
            <div className="console-bar"><span /><span /><span /><b>{product.name}</b></div>
            <div className="console-body">
              <div className="console-list">{product.tags.map((tag, index) => <div key={tag} className={index === 0 ? "active" : ""}><AgentLogo agent={product} /><span>{tag}</span></div>)}</div>
              <div className="console-profile">
                <div className="profile-title"><AgentLogo agent={product} /><span>{product.headline}<small>{product.category}</small></span></div>
                <div className="profile-lines"><b /><b /><b /></div>
                <div className="match-map">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="reference-product-summary">
          <div className="reference-product-main"><div className="reference-product-icon" style={{ background: product.logoGradient }}><AgentLogo agent={product} /></div><div><small>{product.category}{availability ? ` · ${availability}` : ""}</small><h1>{product.name}</h1><span>{product.headline}</span></div></div>
          <div className="reference-actions">{actions}</div>
          <p className="reference-description">{product.description}</p>
          <div className="reference-tags">{product.tags.map((tag) => <span key={tag}><Icon>auto_awesome</Icon>{tag}</span>)}</div>
        </div>
      </section>
      <section className="reference-panel reference-experience">
        <div className="reference-heading"><div><h2><Icon>auto_awesome</Icon> Explore {product.name}</h2><p>{product.comingSoon ? "Planned capabilities published by Odynza." : "Published capabilities from the Odynza catalog."} Visuals are capability illustrations.</p></div></div>
        <div className="reference-gallery">{features.map((feature, index) => <article key={feature}><div className={`product-gallery-visual visual-${index}`}><AgentLogo agent={product} /><div className="gallery-card"><b>{product.tags[index]}</b><span>{product.category}</span></div><i /><i /><i /></div><h3>{feature}</h3></article>)}</div>
      </section>
      <section className="reference-panel">
        <div className="reference-heading"><div><h2><Icon>category</Icon> What it does</h2><p>{product.description}</p></div></div>
        <div className="reference-capabilities">{features.map((feature) => <article key={feature}><span><AgentLogo agent={product} /></span><h3>{feature}</h3></article>)}</div>
      </section>
      <section className="reference-cta">
        <div><small>{availability || "ODYNZA AGENT CATALOG"}</small><h2>Explore {product.name} with your team.</h2><p>{product.comingSoon ? "This agent is listed as coming soon. Visit Odynza for availability updates." : product.headline}</p></div>
        <div>{actions}</div>
      </section>
    </main>
  );
}
