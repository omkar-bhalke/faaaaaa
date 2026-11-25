// Supported bank registry. Add a bank here (and a parser profile in parsers.ts) – no UI change needed.
// `packages` = best-known Android package names; `keywords` = app-label words used to detect the
// installed bank app when a package name differs. Always confirm detected apps in the UI.
export type Bank = {
  id: string;
  name: string;
  short: string;
  color: string;
  packages: string[];
  keywords: string[];
  methods: string[];
};
const M = ["Notification tracking", "Manual entry", "Account Aggregator (needs provider)"];
export const BANKS: Bank[] = [
  { id: "sbi", name: "State Bank of India", short: "SBI", color: "#1b6fb5", packages: ["com.sbi.lotusintouch", "com.sbi.SBIFreedomPlus"], keywords: ["yono", "sbi"], methods: M },
  { id: "bom", name: "Bank of Maharashtra", short: "BoM", color: "#c8312b", packages: [], keywords: ["maharashtra", "mbanking", "mahabank"], methods: M },
  { id: "mgb", name: "Maharashtra Gramin Bank", short: "MGB", color: "#2c7a4b", packages: [], keywords: ["gramin", "mgb"], methods: M },
  { id: "boi", name: "Bank of India", short: "BOI", color: "#1d4f9c", packages: [], keywords: ["bank of india", "boi"], methods: M },
  { id: "hdfc", name: "HDFC Bank", short: "HDFC", color: "#1c3f7c", packages: ["com.snapwork.hdfc", "com.enstage.wibmo.hdfc"], keywords: ["hdfc", "payzapp"], methods: M },
  { id: "icici", name: "ICICI Bank", short: "ICICI", color: "#e0662b", packages: ["com.csam.icici.bank.imobile"], keywords: ["imobile", "icici"], methods: M },
  { id: "axis", name: "Axis Bank", short: "Axis", color: "#9d1d4d", packages: ["com.axis.mobile"], keywords: ["axis"], methods: M },
  { id: "canara", name: "Canara Bank", short: "Canara", color: "#2f8fbf", packages: ["com.canarabank.mobility"], keywords: ["canara", "ai1"], methods: M },
  { id: "pnb", name: "Punjab National Bank", short: "PNB", color: "#a6192e", packages: [], keywords: ["pnb"], methods: M },
  { id: "union", name: "Union Bank of India", short: "Union", color: "#c8102e", packages: [], keywords: ["union bank", "vyom"], methods: M },
  { id: "kotak", name: "Kotak Mahindra Bank", short: "Kotak", color: "#d6232a", packages: ["com.msf.kbank.mobile"], keywords: ["kotak"], methods: M },
  { id: "indian", name: "Indian Bank", short: "Indian", color: "#1b4f8f", packages: [], keywords: ["indian bank", "indoasis"], methods: M },
];
export const bankById = (id: string) => BANKS.find((b) => b.id === id);
export type SelectedBank = {
  id: string;
  primary: boolean;
  packages: string[]; // confirmed bank-app packages that FINORA may read notifications from
  detected: { pkg: string; label: string }[];
  account: string; // masked account id seen in notifications, if any
  lastBalance?: { amount: number; ts: number };
};
