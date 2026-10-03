import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Leads from "./pages/Leads";
import LeadIntake from "./pages/LeadIntake";
import LeadDetails from "./pages/LeadDetails";
import Contacts from "./pages/Contacts";
import Catalog from "./pages/Catalog";
import AgentDetailReference from "./pages/AgentDetailReference";
import Home from "./pages/Home";
import { SignIn, SignUp } from "./pages/Auth";
import { getStoredToken } from "./utils/auth";
import Icon from "./components/Icon";

function ContactsPlaceholder({ onBack }) {
  return (
    <main className="page">
      <div className="panel contacts-placeholder">
        <Icon>contacts</Icon>
        <h1>Contacts</h1>
        <p>The Contacts page is reserved for the next CRM step. Lead contact actions are already routed here.</p>
        <button className="secondary-button" onClick={onBack}><Icon>arrow_back</Icon> Back to Leads</button>
      </div>
    </main>
  );
}


export default function App({ dark, setDark }) {
  const path = window.location.pathname;
  const [page, setPage] = useState("leads");
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  if (path === "/") return <Home />;
  if (path === "/signin") return <SignIn />;
  if (path === "/signup") return <SignUp />;

  // CRM pages require a successful login.
  if (!getStoredToken()) {
    window.location.replace("/signin");
    return null;
  }

  const openLead = (lead) => {
    setSelectedLead(lead);
    setPage("lead-details");
  };

  const navigate = (next) => {
    setPage(next);
    if (next !== "lead-details") setSelectedLead(null);
    if (next !== "contacts") setSelectedContact(null);
    if (next !== "talent-acquisition") setSelectedAgent(null);
  };

  const openAddLead = () => {
    setSelectedLead(null);
    setPage("add-lead");
  };

  const handleLeadCreated = () => {
    setSelectedLead(null);
    setPage("leads");
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="app-main">
        <Topbar dark={dark} setDark={setDark} />
        {page === "leads" && <Leads onOpenLead={openLead} onAddLead={openAddLead} />}
        {page === "add-lead" && <LeadIntake onBack={() => navigate("leads")} onCreated={handleLeadCreated} />}
        {page === "lead-details" && <LeadDetails lead={selectedLead} onBack={() => navigate("leads")} onDeleted={() => navigate("leads")} onOpenContacts={(lead) => { setSelectedContact(lead); setPage("contacts"); }} />}
        {page === "contacts" && <Contacts initialContact={selectedContact} onOpenLead={openLead} />}
        {page === "catalog" && <Catalog onOpenAgent={(agent) => { setSelectedAgent(agent); setPage("talent-acquisition"); }} />}
        {page === "talent-acquisition" && <AgentDetailReference agent={selectedAgent} onBack={() => navigate("catalog")} />}
      </div>
    </div>
  );
}
