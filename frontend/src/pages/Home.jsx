import React from "react";
import Icon from "../components/Icon";

export default function Home() {
  return (
    <div className="entry-page">
      <div className="entry-glow entry-glow-top" />
      <div className="entry-glow entry-glow-bottom" />

      <header className="entry-header">
        <a className="entry-brand" href="/" aria-label="Odynza home">
          <span className="entry-brand-mark"><Icon>token</Icon></span>
          <span className="entry-brand-name">Odynza</span>
          <span className="entry-brand-badge"><span /> AI CRM</span>
        </a>

        <div className="entry-header-actions">
          <a className="entry-link-button" href="/signin">Sign In</a>
          <a className="entry-primary-button" href="/signup">Create Account</a>
        </div>
      </header>

      <main className="entry-main">
        <section className="entry-hero">
          <div className="entry-pill"><span className="pulse-dot" /> Enterprise AI Sales Intelligence • Next-Gen Mesh</div>

          <h1>
            Turn Relationships Into <span>Opportunities.</span>
          </h1>

          <p>
            Odynza brings your leads, customer relationships, and AI-powered
            solutions together in one intelligent CRM.
          </p>

          <div className="entry-cta-row">
            <a className="entry-cta-primary" href="/signin">
              Sign In <Icon>arrow_forward</Icon>
            </a>
            <a className="entry-cta-secondary" href="/signup">Create Account</a>
          </div>
        </section>

        <section className="neural-panel">
          <div className="neural-panel-header">
            <div className="neural-title"><Icon>hub</Icon> Active Neural Topology</div>
            <div className="neural-badges">
              <span><i /> AI CRM Core</span>
              <span><Icon>insights</Icon> Intelligent Pipeline</span>
            </div>
          </div>

          <div className="neural-stage">
            <svg className="neural-lines" viewBox="0 0 1000 500" preserveAspectRatio="none">
              <defs>
                <linearGradient id="homeFlow1" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#4cd7f6" stopOpacity=".85" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity=".15" />
                </linearGradient>
                <linearGradient id="homeFlow2" x1="100%" x2="0%">
                  <stop offset="0%" stopColor="#c3c0ff" stopOpacity=".8" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity=".15" />
                </linearGradient>
              </defs>
              <path d="M80 120 C260 40 330 210 500 250 C670 290 730 80 920 130" stroke="url(#homeFlow1)" />
              <path d="M80 380 C240 460 350 280 500 250 C650 220 770 420 920 350" stroke="url(#homeFlow2)" />
              <path d="M130 250 C290 170 380 330 500 250 C620 170 760 300 870 250" className="neural-secondary-line" />
            </svg>

            <div className="neural-node node-left-top"><Icon>groups</Icon><b>Customer Signals</b><small>Lead intelligence</small></div>
            <div className="neural-node node-left-bottom"><Icon>filter_alt</Icon><b>Lead Pipeline</b><small>Opportunity flow</small></div>

            <div className="neural-core">
              <div className="neural-core-orbit" />
              <div className="neural-core-icon"><Icon>memory</Icon></div>
              <b>Odynza Cognitive Core</b>
              <small>Intelligent CRM orchestration</small>
            </div>

            <div className="neural-node node-right-top"><Icon>smart_toy</Icon><b>AI Agent Fleet</b><small>Automated intelligence</small></div>
            <div className="neural-node node-right-bottom"><Icon>trending_up</Icon><b>Revenue Forecast</b><small>Pipeline insights</small></div>
          </div>
        </section>

        <section className="entry-concepts">
          <article><span>01</span><Icon>target</Icon><h3>Leads</h3><p>Track and manage your opportunities.</p></article>
          <article><span>02</span><Icon>psychology</Icon><h3>AI Solutions</h3><p>Explore intelligent solutions for your business.</p></article>
          <article><span>03</span><Icon>hub</Icon><h3>Relationships</h3><p>Keep customer interactions organized.</p></article>
        </section>
      </main>

      <footer className="entry-footer">
        <div><strong>Odynza</strong><span>AI-powered customer relationship management.</span></div>
        <nav><a href="/signin">Sign In</a><a href="/signup">Create Account</a></nav>
      </footer>
    </div>
  );
}
