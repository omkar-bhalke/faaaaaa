import { BANKS } from "./banks";
export type RawNotification = { id: string; pkg: string; title: string; text: string; ts: number; test?: boolean };
export type Parsed = {
  bankId: string;
  amount: number;
  type: "credit" | "debit";
  account?: string;
  merchant?: string;
  ref?: string;
  balance?: number;
  ts: number;
  confidence: number;
  notes: string[];
};
export interface BankNotificationParser {
  bankId: string;
  parse(raw: RawNotification): Parsed | null;
}
const SENSITIVE = /\b(otp|one[- ]?time|verification code|passcode|password|cvv|m-?pin|upi pin|do not share|never share)\b/i;
export const isSensitive = (t: string) => SENSITIVE.test(t);
const num = (s: string) => Number(s.replace(/,/g, ""));
const AMT = /(?:rs\.?|inr|\u20B9)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const BAL = /(?:avl\.?\s*bal(?:ance)?|available\s*bal(?:ance)?|clear\s*bal(?:ance)?|bal(?:ance)?)\s*(?:is|:|-)?\s*(?:rs\.?|inr|\u20B9)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const REF = /(?:upi\s*ref(?:\s*no)?|ref(?:erence)?(?:\s*(?:no|id))?|utr|rrn|txn\s*id|imps\s*ref)\.?\s*[:\-]?\s*([A-Za-z0-9]{6,22})/i;
const DEBIT = /\b(debited|debit|spent|withdrawn|paid|sent|purchase|transferred to|dr)\b/i;
const CREDIT = /\b(credited|credit|received|deposited|refund(?:ed)?|cr)\b/i;
export type Profile = { account: RegExp[]; merchant: RegExp[] };
const COMMON_ACC = [
  /(?:a\/c|acct?|account)\s*(?:no\.?)?\s*(?:ending|number)?\s*[:\-]?\s*(?:x+|\*+|\u2022+)?\s*(\d{3,6})/i,
  /(?:x{2,}|\*{2,}|\u2022{2,})\s*(\d{3,6})/i,
];
const COMMON_MERCHANT = [
  /(?:trf to|transfer to|paid to|sent to|towards|to|at|info:?|vpa)\s+([A-Za-z0-9][A-Za-z0-9 .&@_\/-]{2,38}?)(?=\s+(?:on|ref|upi|avl|bal|a\/c|via|using|dated|\()|[.,;]|$)/i,
  /(?:from|by)\s+([A-Za-z0-9][A-Za-z0-9 .&@_\/-]{2,38}?)(?=\s+(?:on|ref|upi|avl|bal|a\/c|via|using|dated|\()|[.,;]|$)/i,
];
export function makeParser(bankId: string, p: Partial<Profile> = {}): BankNotificationParser {
  const accRe = [...(p.account || []), ...COMMON_ACC];
  const merRe = [...(p.merchant || []), ...COMMON_MERCHANT];
  return {
    bankId,
    parse(raw) {
      const text = (raw.title + " " + raw.text).replace(/\s+/g, " ").trim();
      if (!text || isSensitive(text)) return null;
      const notes: string[] = [];
      const bal = text.match(BAL);
      const balance = bal ? num(bal[1]) : undefined;
      // amount = first currency amount that is not the balance figure
      let amount = NaN;
      for (const m of text.matchAll(AMT)) {
        const v = num(m[1]);
        const before = text.slice(Math.max(0, (m.index || 0) - 22), m.index).toLowerCase();
        if (/bal/.test(before)) continue;
        amount = v;
        break;
      }
      if (!(amount > 0)) return null;
      const d = DEBIT.test(text), c = CREDIT.test(text);
      let type: Parsed["type"] | undefined;
      let confidence = 0.35;
      if (d && !c) type = "debit";
      else if (c && !d) type = "credit";
      else if (d && c) {
        // both words present: use whichever comes first, but flag as less certain
        type = text.search(DEBIT) < text.search(CREDIT) ? "debit" : "credit";
        notes.push("Both debit and credit wording found");
        confidence += 0.1;
      }
      if (!type) return null;
      if (d !== c) confidence += 0.3;
      let account: string | undefined;
      for (const r of accRe) {
        const m = text.match(r);
        if (m) {
          account = "••" + m[1];
          confidence += 0.15;
          break;
        }
      }
      const ref = text.match(REF)?.[1];
      if (ref && /\d/.test(ref)) confidence += 0.1;
      let merchant: string | undefined;
      for (const r of merRe) {
        const m = text.match(r);
        if (m && !/^(a\/c|acct|account|your|credited|debited|rs|inr)/i.test(m[1])) {
          merchant = m[1].trim();
          confidence += 0.1;
          break;
        }
      }
      if (!account) notes.push("Account not identified");
      if (!merchant) notes.push("Merchant not identified");
      return { bankId, amount, type, account, merchant, ref: ref && /\d/.test(ref) ? ref : undefined, balance, ts: raw.ts, confidence: Math.min(1, Number(confidence.toFixed(2))), notes };
    },
  };
}
// Bank-specific profiles. Formats differ per bank/app version; tune the regexes with real samples.
export const SBIParser = makeParser("sbi", { account: [/a\/c\s*(?:no\.?)?\s*x*(\d{3,6})/i] });
export const BankOfMaharashtraParser = makeParser("bom");
export const MaharashtraGraminBankParser = makeParser("mgb");
export const BankOfIndiaParser = makeParser("boi");
export const HDFCParser = makeParser("hdfc", { account: [/a\/c\s*(?:no\.?)?\s*x{2,}(\d{3,6})/i] });
export const ICICIParser = makeParser("icici", { account: [/acct\s*x{2,}(\d{3,6})/i] });
export const AxisParser = makeParser("axis");
export const CanaraParser = makeParser("canara");
const specific: BankNotificationParser[] = [SBIParser, BankOfMaharashtraParser, MaharashtraGraminBankParser, BankOfIndiaParser, HDFCParser, ICICIParser, AxisParser, CanaraParser];
export const parserFor = (bankId: string): BankNotificationParser =>
  specific.find((p) => p.bankId === bankId) || makeParser(bankId);
// sanity: every registered bank has a parser (generic fallback otherwise)
export const _registered = BANKS.map((b) => parserFor(b.id).bankId);
// Auto-categorise ONLY when the merchant is clearly recognisable; otherwise "Others" for the user to review.
const CAT: [RegExp, string][] = [
  [/swiggy|zomato|dominos|mcdonald|kfc|cafe|restaurant|bigbasket|blinkit|zepto|instamart/i, "Food"],
  [/uber|ola|rapido|irctc|redbus|metro|indigo|makemytrip|fastag/i, "Travel"],
  [/amazon|flipkart|myntra|ajio|meesho/i, "Shopping"],
  [/airtel|jio|vodafone|vi |bsnl|electricity|mseb|gas|broadband|recharge/i, "Bills"],
  [/netflix|hotstar|spotify|bookmyshow|pvr|inox/i, "Entertainment"],
  [/pharmacy|apollo|medplus|hospital|clinic|1mg|pharmeasy/i, "Health"],
];
export const guessCategory = (merchant?: string) => (merchant && CAT.find(([r]) => r.test(merchant))?.[1]) || "";
