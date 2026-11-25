import { State, Tx, ReviewItem, NLog, uid, dateKey } from "./model";
import { RawNotification, parserFor, Parsed, guessCategory } from "./parsers";
import { bankById } from "./banks";

const AUTO = 0.75; // below this, the user must confirm
const dayOf = (ts: number) => dateKey(new Date(ts));
const timeOf = (ts: number) => new Date(ts).toTimeString().slice(0, 5);
const title = (p: Parsed) => p.merchant || (p.type === "debit" ? "Bank debit" : "Bank credit");

export function dedupeKey(p: Parsed) {
  return p.ref ? [p.bankId, p.ref].join("|") : "";
}
function existing(s: State, p: Parsed): "duplicate" | "maybe" | "" {
  const k = dedupeKey(p);
  if (k && s.tx.some((t) => t.bankId === p.bankId && t.ref && [t.bankId, t.ref].join("|") === k)) return "duplicate";
  if (k && s.review.some((r) => r.bankId === p.bankId && r.ref && [r.bankId, r.ref].join("|") === k)) return "duplicate";
  // no reference: same bank/amount/type within 2 minutes -> ask, never silently merge two real payments
  const near = (ts: number) => Math.abs(ts - p.ts) < 120000;
  if (!k && s.tx.some((t) => t.source === "notification" && t.bankId === p.bankId && t.amount === p.amount && t.type === p.type && near(new Date(t.date + "T" + t.time).getTime()))) return "maybe";
  // a manual entry of same amount/type that day may be the same payment
  if (s.tx.some((t) => t.source === "manual" && t.amount === p.amount && t.type === p.type && t.date === dayOf(p.ts))) return "maybe";
  return "";
}
export function ingest(s: State, raws: RawNotification[]): { state: State; saved: number; review: number } {
  let saved = 0, rev = 0;
  const seen = new Set(s.seen);
  const tx = [...s.tx], review = [...s.review], nlog: NLog[] = [], banks = s.banks.map((b) => ({ ...b }));
  const log = (r: RawNotification, bankId: string, result: NLog["result"], summary: string) => nlog.push({ id: uid(), ts: r.ts, bankId, result, summary });
  for (const r of raws) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.test) { log(r, "", "test", "Test notification received – notification access works."); continue; }
    const bank = banks.find((b) => b.packages.includes(r.pkg));
    if (!bank) continue; // not a selected bank app
    const p = parserFor(bank.id).parse(r);
    if (!p) { log(r, bank.id, "ignored", "Not a transaction (nothing saved)."); continue; }
    if (p.account) bank.account = p.account;
    if (p.balance !== undefined) bank.lastBalance = { amount: p.balance, ts: p.ts };
    const state = { ...s, tx, review };
    const dup = existing(state, p);
    if (dup === "duplicate") { log(r, bank.id, "duplicate", "Already recorded – skipped."); continue; }
    const cat = p.type === "debit" ? guessCategory(p.merchant) : "Income";
    if (p.confidence >= AUTO && !dup) {
      tx.push({ id: uid(), title: title(p), amount: p.amount, category: cat || "Others", date: dayOf(p.ts), time: timeOf(p.ts), type: p.type, method: "Bank notification", notes: "", source: "notification", bankId: bank.id, account: p.account, ref: p.ref, confidence: p.confidence, recon: "auto" });
      saved++;
      log(r, bank.id, "saved", (p.type === "debit" ? "−" : "+") + p.amount + " " + title(p));
    } else {
      const item: ReviewItem = { id: uid(), bankId: bank.id, amount: p.amount, type: p.type, title: title(p), account: p.account, ref: p.ref, ts: p.ts, confidence: p.confidence, category: cat, reason: dup === "maybe" ? "Possible duplicate of an existing record" : p.notes.join(". ") || "Low confidence" };
      review.push(item);
      rev++;
      log(r, bank.id, "review", "Needs your review: " + p.amount + " " + title(p));
    }
  }
  return { state: { ...s, tx, review, banks, seen: [...seen].slice(-300), nlog: [...nlog.reverse(), ...s.nlog].slice(0, 50), sync: new Date().toISOString() }, saved, review: rev };
}
export const confirmReview = (s: State, id: string, edit: Partial<ReviewItem>): State => {
  const it = s.review.find((r) => r.id === id);
  if (!it) return s;
  const r = { ...it, ...edit };
  const t: Tx = { id: uid(), title: r.title, amount: r.amount, category: r.category || "Others", date: dayOf(r.ts), time: timeOf(r.ts), type: r.type, method: "Bank notification", notes: "", source: "notification", bankId: r.bankId, account: r.account, ref: r.ref, confidence: r.confidence, recon: "user-confirmed" };
  return { ...s, tx: [...s.tx, t], review: s.review.filter((x) => x.id !== id) };
};
export const bankName = (id?: string) => (id ? bankById(id)?.name || id : "");
