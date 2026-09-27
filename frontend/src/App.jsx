import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Leads from "./pages/Leads";
import LeadDetails from "./pages/LeadDetails";
import Catalog from "./pages/Catalog";
import Home from "./pages/Home";
import { SignIn, SignUp } from "./pages/Auth";
import { getStoredToken } from "./utils/auth";


export default function App({ dark, setDark }) {
  const path = window.location.pathname;
  const [page, setPage] = useState("leads");
  const [selectedLead, setSelectedLead] = useState(null);

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
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="app-main">
        <Topbar dark={dark} setDark={setDark} />
        {page === "leads" && <Leads onOpenLead={openLead} />}
        {page === "lead-details" && <LeadDetails lead={selectedLead} onBack={() => navigate("leads")} />}
        {page === "catalog" && <Catalog />}
      </div>
    </div>
  );
}
