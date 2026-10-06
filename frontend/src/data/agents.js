// Product names, categories, availability and features from https://odynza.com/.
// Descriptions are concise summaries; unpublished specifications are omitted.
const logoGradients = {
  Finance: "linear-gradient(135deg,#10b981,#14b8a6)",
  People: "linear-gradient(135deg,#3b82f6,#6366f1)",
  Growth: "linear-gradient(135deg,#f97316,#ef4444)",
  Legal: "linear-gradient(135deg,#a855f7,#ec4899)",
  Operations: "linear-gradient(135deg,#06b6d4,#3b82f6)",
  Health: "linear-gradient(135deg,#f43f5e,#dc2626)",
  Assistant: "linear-gradient(135deg,#326bd6,#212121)",
  Recruitment: "linear-gradient(135deg,#14b8a6,#10b981)",
};

export const agents = [
  {
    id: "financeflow-egypt", name: "FinanceFlow Egypt", category: "Finance",
    headline: "Automated VAT & Tax Engine", icon: "account_balance",
    description: "Processes Excel sheets and invoices for Egyptian tax classification and ETA submissions.",
    tags: ["ETA", "VAT", "Cash Flow"],
    capabilities: ["ETA-compliant invoice generation", "Automated VAT returns", "Real-time cash flow dashboards"],
  },
  {
    id: "hr-egypt-pro", name: "HR Egypt Pro", category: "People",
    headline: "Labor Law Compliance", icon: "badge",
    description: "Supports bilingual employment contracts and complex payroll calculations for Egyptian HR teams.",
    tags: ["Contracts", "Payroll", "Onboarding"],
    capabilities: ["Labor law compliant docs", "Automated payroll", "Employee onboarding"],
  },
  {
    id: "marketscope-mena", name: "MarketScope MENA", category: "Growth",
    headline: "Localized Sales Intelligence", icon: "campaign",
    description: "Sales and marketing intelligence shaped by Arab market dynamics and customer behavior.",
    tags: ["Campaigns", "Follow-up", "Localization"],
    capabilities: ["Ramadan-specific campaigns", "Lead follow-up sequences", "Localized content"],
  },
  {
    id: "legaliq-mena", name: "LegalIQ MENA", category: "Legal",
    headline: "Contract & Compliance", icon: "gavel", comingSoon: true,
    description: "Legal document processing and compliance checks for Egyptian and MENA frameworks.",
    tags: ["Contracts", "Compliance", "Drafting"],
    capabilities: ["Contract summarization", "Compliance verification", "Legal drafting"],
  },
  {
    id: "logistics-os", name: "LogisticsOS", category: "Operations",
    headline: "Supply Chain Intelligence", icon: "local_shipping", comingSoon: true,
    description: "Regional supply chain intelligence for demand, inventory, and logistics.",
    tags: ["Forecasting", "Inventory", "Routes"],
    capabilities: ["Demand forecasting", "Inventory optimization", "Route planning"],
  },
  {
    id: "careflow-health", name: "CareFlow Health", category: "Health",
    headline: "Clinical Workflow Automation", icon: "health_and_safety", comingSoon: true,
    description: "Workflow automation for regional clinics and medical facilities.",
    tags: ["Patients", "Appointments", "Billing"],
    capabilities: ["Patient management", "Appointment scheduling", "Billing automation"],
  },
  {
    id: "egygpt-pro", name: "EgyGPT Pro", category: "Assistant",
    headline: "Bilingual Corporate Brain", icon: "forum", status: "Flagship",
    description: "An assistant fluent in Arabic dialects and English, with regional context.",
    tags: ["Bilingual", "Knowledge Base", "Context"],
    capabilities: ["Bilingual communication", "Custom knowledge base", "Context awareness"],
  },
  {
    id: "cv-agent", name: "CV Agent", category: "Recruitment",
    headline: "AI-Powered CV Evaluation", icon: "person_search", status: "Live Now",
    description: "Batch candidate evaluation for recruiters; CV feedback, gap analysis, and cover letters for job seekers.",
    tags: ["Recruitment", "CV Optimization", "Interviews"],
    capabilities: ["Hiring: Batch CV evaluation & ranking", "Applying: CV optimization & cover letters", "20+ interview questions generation"],
    useNowLink: "https://odynza.com/cv-agent/",
  },
].map((agent) => ({ ...agent, logoGradient: logoGradients[agent.category], sourceUrl: "https://odynza.com/#agents-gallery" }));
