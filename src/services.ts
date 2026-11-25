import { State, summary, total, dateKey, cats } from "./model";
// Backend (Render) base URL. Leave empty until the automation backend is deployed.
export const BACKEND_URL = "";
export type Result<T> = { mode: "local"; data: T };
const local = <T>(data: T): Result<T> => ({ mode: "local", data });
export const services = {
  restrictions: {
    applies: (s: State, app: string) =>
      local(s.control !== "Disabled" && s.apps.includes(app) && summary(s).spent >= s.daily),
  },
  analytics: { summarize: summary },
  ai: {
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
