import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Leads from "./pages/Leads";
import Dashboard from "./pages/Dashboard";
import Deals from "./pages/Deals";
import Users from "./pages/Users";
import { AccountProvider, useAccount } from "./context/AccountContext";
import { canViewLeadRecord } from "./utils/permissions";
import LeadIntake from "./pages/LeadIntake";
import LeadDetails from "./pages/LeadDetails";
import Catalog from "./pages/Catalog";
import AgentDetailReference from "./pages/AgentDetailReference";
import Home from "./pages/Home";
import { SignIn, SignUp } from "./pages/Auth";
import { getStoredToken } from "./utils/auth";

export default function App({ dark, setDark }) {
  const path = window.location.pathname;
  if (path === "/") return <Home dark={dark} setDark={setDark} />;
  if (path === "/signin") return <SignIn dark={dark} setDark={setDark} />;
  if (path === "/signup") return <SignUp dark={dark} setDark={setDark} />;
  if (!getStoredToken()) {
    window.location.replace("/signin");
    return null;
  }
  return <AccountProvider><Workspace dark={dark} setDark={setDark} /></AccountProvider>;
}

function Workspace({ dark, setDark }) {
  const { user, loading, error, refreshAccount, can, isUserAdmin } = useAccount();
  const [page, setPage] = useState("dashboard");
  const [leadReturnPage, setLeadReturnPage] = useState("leads");
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [intakeReturnPage, setIntakeReturnPage] = useState("leads");

  if (loading) return <main className="page"><p role="status">Verifying your account…</p></main>;
  if (!user) return <main className="page"><h1>Account verification required</h1><p role="alert">{error}</p><button className="secondary-button" onClick={refreshAccount}>Try again</button> <a href="/signin">Sign in again</a></main>;
  const allowed = (next) => next === "users" ? isUserAdmin : next === "lead-details" ? canViewLeadRecord(user, selectedLead) : next === "add-lead" ? can("create_leads") : ["catalog", "talent-acquisition"].includes(next) ? can("view_catalog") : can("view_leads");
  const visiblePage = allowed(page) ? page : can("view_leads") ? "dashboard" : can("view_catalog") ? "catalog" : "denied";
  // Discard cached privileged records as soon as the account's access changes.
  const accountKey = `${user.id}:${user.role}:${(user.permissions || []).join(",")}`;

  const openLead = (lead) => {
    setLeadReturnPage(["dashboard", "deals"].includes(page) ? page : "leads");
    setSelectedLead(lead);
    setPage("lead-details");
  };

  const navigate = (next) => {
    if (!allowed(next)) return;
    setPage(next);
    if (next !== "lead-details") setSelectedLead(null);
    if (next !== "talent-acquisition") setSelectedAgent(null);
  };

  const openAddLead = () => {
    setSelectedLead(null);
    setIntakeReturnPage("leads");
    setPage("add-lead");
  };

  const openNewOpportunity = () => {
    if (!can("create_leads")) return;
    setSelectedLead(null);
    setIntakeReturnPage("deals");
    setPage("add-lead");
  };

  const handleLeadCreated = () => {
    setSelectedLead(null);
    setPage(intakeReturnPage);
  };

  return (
    <div className="app-shell">
      <Sidebar page={visiblePage} onNavigate={navigate} />
      <div className="app-main">
        <Topbar dark={dark} setDark={setDark} />
        {visiblePage === "dashboard" && <Dashboard key={accountKey} onOpenLead={openLead} onViewLeads={() => navigate("leads")} />}
        {visiblePage === "deals" && <Deals key={accountKey} onOpenLead={openLead} onNewOpportunity={openNewOpportunity} onViewLeads={() => navigate("leads")} />}
        {visiblePage === "users" && <Users />}
        {visiblePage === "leads" && <Leads key={accountKey} onOpenLead={openLead} onAddLead={openAddLead} />}
        {visiblePage === "add-lead" && <LeadIntake key={`${accountKey}:${intakeReturnPage}`} opportunity={intakeReturnPage === "deals"} onBack={() => navigate(intakeReturnPage)} onCreated={handleLeadCreated} />}
        {visiblePage === "lead-details" && <LeadDetails key={accountKey} lead={selectedLead} onBack={() => navigate(leadReturnPage)} onDeleted={() => navigate(leadReturnPage)} />}
        {visiblePage === "catalog" && <Catalog onOpenAgent={(agent) => { setSelectedAgent(agent); setPage("talent-acquisition"); }} />}
        {visiblePage === "talent-acquisition" && <AgentDetailReference agent={selectedAgent} onBack={() => navigate("catalog")} />}
        {visiblePage === "denied" && <main className="page"><h1>No workspace access</h1><p>Please contact an administrator.</p></main>}
      </div>
    </div>
  );
}
