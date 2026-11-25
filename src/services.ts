import { State, summary, total, dateKey, cats } from "./model";
import { auth } from "./firebase";
// Backend (Render) base URL. Leave empty until the automation backend is deployed.
export const BACKEND_URL: string = (import.meta.env.VITE_BACKEND_URL as string) || "";
export type Result<T> = { mode: "local"; data: T };
const local = <T>(data: T): Result<T> => ({ mode: "local", data });
// Calls the Render backend with the user's Firebase ID token. Throws on any failure so callers can fall back.
export async function backend<T>(path: string, body: unknown): Promise<T> {
  if (!BACKEND_URL) throw new Error("Backend not configured");
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const r = await fetch(BACKEND_URL.replace(/\/$/, "") + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as any).error || "Request failed");
  return j as T;
}
export const services = {
  restrictions: {
    applies: (s: State, app: string) =>
      local(s.control !== "Disabled" && s.apps.includes(app) && summary(s).spent >= s.daily),
  },
  analytics: { summarize: summary },
  ai: {
    // Server-side AI (key never ships in the app). Sends only aggregates, not raw transactions. Falls back to local answers.
    askRemote: async (q: string, s: State, f: (n: number) => string): Promise<string> => {
      try {
        const m = summary(s);
        const context = { currency: s.currency, dailyLimit: s.daily, monthlyBudget: s.monthly, spentToday: m.spent, spentThisMonth: m.monthly, fixedBills: m.fixed,
          byCategory: Object.fromEntries(cats.map((c) => [c, total(m.month.filter((t) => t.category === c))])) };
        return (await backend<{ answer: string }>("/ai/chat", { question: q, context })).answer;
      } catch { return services.ai.ask(q, s, f).data; }
    },
    // Answers computed from the user's real records (LLM-backed answers will come from the backend).
    ask: (q: string, s: State, f: (n: number) => string) => {
      const m = summary(s), l = q.toLowerCase(),
        food = total(m.month.filter((x) => x.category === "Food")),
        top = cats.map((c) => ({ c, n: total(m.month.filter((t) => t.category === c)) })).sort((a, b) => b.n - a.n)[0],
        income = total(s.tx.filter((t) => t.type === "credit" && t.date.startsWith(dateKey().slice(0, 7))));
      return local(
        /food/.test(l) ? "Food spending this month is " + f(food) + "."
        : /which|categor|most/.test(l) ? (top.n ? top.c + " leads this month at " + f(top.n) + "." : "No expenses recorded this month yet.")
        : /sav/.test(l) ? "Income recorded this month minus expenses is " + f(income - m.monthly) + "."
        : /today|daily|budget/.test(l) ? "Today you spent " + f(m.spent) + " of your " + f(s.daily) + " daily limit. " + f(Math.abs(s.daily - m.spent)) + (m.spent > s.daily ? " over budget." : " remains.")
        : /fixed|bill/.test(l) ? "Your active monthly bills total " + f(m.fixed) + "."
        : "I can answer questions about today’s spending, food, monthly savings, fixed bills or your highest spending category.",
      );
    },
  },
};
