export const agents = [
  {
    id: "hr-egypt-pro", name: "HR Egypt Pro", category: "People",
    headline: "Automates end-to-end employee onboarding, localized bilingual contracts, and labor compliance.",
    icon: "badge", tags: ["Onboarding", "Bilingual", "Labor Compliance"],
    capabilities: ["Automated onboarding workflows", "Bilingual contract formulation", "Social insurance tax audit", "Real-time labor compliance guardrails"],
    model: "Claude 3.5 Sonnet Fine-Tuned", latency: "410ms", accuracy: "99.8%", cost: "$0.024 / employee run", context: "128k Tokens"
  },
  {
    id: "financeflow-egypt", name: "FinanceFlow Egypt", category: "Finance",
    headline: "Real-time automated reconciliation, invoice ledger validation, and VAT compliance forecasting.",
    icon: "account_balance", tags: ["Reconciliation", "VAT Rules", "Ledger Audit"],
    capabilities: ["Real-time dual ledger balancing", "Automated ETA tax matching", "Discrepancy alert routing", "Predictive cash flow hedging"],
    model: "Claude 3.5 Sonnet", latency: "360ms", accuracy: "99.6%", cost: "$0.018 / run", context: "128k Tokens"
  },
  {
    id: "salesscope-mena", name: "SalesScope MENA", category: "Sales",
    headline: "AI sales intelligence for account research, lead qualification, and opportunity prioritization.",
    icon: "target", tags: ["Lead Scoring", "Research", "Prioritization"],
    capabilities: ["Account intelligence", "Lead scoring", "Buying signal detection", "CRM enrichment"],
    model: "GPT-4.1 Fine-Tuned", latency: "290ms", accuracy: "98.9%", cost: "$0.012 / lead", context: "128k Tokens"
  },
  {
    id: "supportgenie", name: "SupportGenie", category: "Customer Support",
    headline: "Autonomous customer support agent with multilingual resolution and escalation workflows.",
    icon: "support_agent", tags: ["Support", "Multilingual", "Escalation"],
    capabilities: ["Ticket classification", "Knowledge retrieval", "Multilingual replies", "Human escalation"],
    model: "GPT-4.1", latency: "240ms", accuracy: "97.8%", cost: "$0.009 / ticket", context: "128k Tokens"
  },
  {
    id: "invoice-processing", name: "Invoice Processing Agent", category: "Finance",
    headline: "Extracts, validates, and routes invoices across ERP and finance workflows.",
    icon: "receipt_long", tags: ["OCR", "ERP", "Validation"],
    capabilities: ["Invoice extraction", "PO matching", "Duplicate detection", "Approval routing"],
    model: "Document AI + LLM", latency: "520ms", accuracy: "99.2%", cost: "$0.014 / invoice", context: "64k Tokens"
  },
  {
    id: "cv-screening", name: "CV Screening Agent", category: "People",
    headline: "Screens CVs against job requirements and ranks qualified candidates automatically.",
    icon: "person_search", tags: ["CV", "Ranking", "Recruitment"],
    capabilities: ["CV parsing", "Requirement matching", "Candidate ranking", "Recruiter summaries"],
    model: "BERT + LLM", latency: "330ms", accuracy: "98.7%", cost: "$0.008 / CV", context: "32k Tokens"
  },
  {
    id: "lead-qualification", name: "Lead Qualification Agent", category: "Sales",
    headline: "Qualifies inbound leads, extracts requirements, and recommends next sales actions.",
    icon: "verified", tags: ["Qualification", "Requirements", "Sales"],
    capabilities: ["Requirement extraction", "Lead scoring", "Next-action suggestions", "CRM enrichment"],
    model: "LangGraph + LLM", latency: "280ms", accuracy: "98.5%", cost: "$0.011 / lead", context: "64k Tokens"
  },
  {
    id: "document-intelligence", name: "Document Intelligence Agent", category: "Operations",
    headline: "Understands enterprise documents and turns unstructured content into structured data.",
    icon: "description", tags: ["Documents", "Extraction", "RAG"],
    capabilities: ["Document extraction", "Classification", "Structured output", "RAG-ready indexing"],
    model: "Vision LLM", latency: "610ms", accuracy: "99.1%", cost: "$0.021 / document", context: "128k Tokens"
  }
];
