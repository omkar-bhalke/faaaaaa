import { useEffect, useState } from "react";
import {
  useApp,
  I,
  Btn,
  Title,
  Field,
  Badge,
  Empty,
  IconBtn,
  Mark,
  Contours,
} from "./ui";
import { dateKey, summary, total, cats, offset, emptyState } from "./model";
import { Confirm, Rules, Integrations } from "./planning";
import { services } from "./services";
import { googleSignIn, authMessage, logout, deleteCloud } from "./firebase";
import { native } from "./native";
import { BankSelect, NotificationAccess } from "./bankui";
export function ProfileForm({
  next,
  budget = false,
  only = false,
}: {
  next?: () => void;
  budget?: boolean;
  only?: boolean;
}) {
  const { s, set, toast } = useApp(),
    [daily, D] = useState(String(s.daily));
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget),
      v = (k: string) => String(fd.get(k) || "").trim();
    if (fd.has("name") && !v("name")) return;
    set((p) => ({
      ...p,
      ...(!budget
        ? {
            name: v("name"),
            email: v("email"),
            income: Number(v("income")),
            opening: Number(v("opening") || 0),
            country: v("country"),
          }
        : {}),
      currency: v("currency"),
      ...(budget || !only
        ? { daily: Number(v("daily")), monthly: Number(v("monthly")) }
        : {}),
    }));
    if (next) next();
    else toast("Profile and budget saved");
  }
  return (
    <form className="panel formgrid" onSubmit={save}>
      {!budget && (
        <>
          <Field label="Full name">
            <input required name="name" defaultValue={s.name} maxLength={60} />
          </Field>
          <Field label="Email">
            <input required type="email" name="email" defaultValue={s.email} />
          </Field>
          <Field label="Country">
            <input name="country" required defaultValue={s.country} />
          </Field>
          <Field label="Opening balance (user-entered, optional)">
            <input name="opening" type="number" step=".01" defaultValue={s.opening || ""} />
            <small>Your balance is calculated from this plus your recorded income and expenses.</small>
          </Field>
          <Field label="Monthly income (optional)">
            <input
              name="income"
              min="0"
              type="number"
              step=".01"
              defaultValue={s.income || ""}
            />
          </Field>
        </>
      )}
      <Field label="Preferred currency">
        <select defaultValue={s.currency} name="currency">
          {["INR", "USD", "GBP", "EUR"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <small>Changes the display unit without currency conversion.</small>
      </Field>
      {(budget || !only) && (
        <>
          <Field label="Daily spending limit">
            <input
              name="daily"
              required
              min=".01"
              step=".01"
              type="number"
              value={daily}
              onChange={(e) => D(e.target.value)}
            />
            {budget && (
              <div className="seg">
                {[300, 500, 750].map((x) => (
                  <button type="button" key={x} onClick={() => D(String(x))}>
                    {x}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Monthly budget">
            <input
              required
              name="monthly"
              type="number"
              step=".01"
              min=".01"
              defaultValue={s.monthly}
            />
          </Field>
        </>
      )}
      <div className="formend">
        <Btn type="submit">{next ? "Save and continue" : "Save changes"}</Btn>
      </div>
    </form>
  );
}
export function Welcome() {
  const { go, s, f, toast } = useApp(),
    [busy, B] = useState(false);
  async function login() {
    B(true);
    try {
      await googleSignIn();
    } catch (e) {
      toast(authMessage(e));
    }
    B(false);
  }
  return (
    <>
      <Title
        title="Welcome to Finora"
        sub="Understand Your Money. Control Your Spending."
      />
      <div className="welcome panel">
        <div className="welcomeart">
          <Contours />
          <Mark />
          <h1>
            Your money,{" "}
            <br />
            in focus.
          </h1>
          <div className="artcard">
            <div>
              <Mark />
              <b>Finora.</b>
              <I n="Activity" />
            </div>
            <small>AVAILABLE BALANCE</small>
            <strong>{f(summary(s).balance, 2)}</strong>
            <footer>
              ••••　••••　••••　•••• <I n="CreditCard" />
            </footer>
          </div>
          <span>FINORA　/　PERSONAL FINANCE</span>
        </div>
        <div className="welcomecopy">
          <h2>A clearer view of your finances</h2>
          <Btn disabled={busy} onClick={login}>
            {busy ? "Signing in…" : "Continue with Google"}
          </Btn>
          <small>New here? Signing in with Google creates your account.</small>
          {[
            ["Link2", "Track expenses from your bank notifications"],
            ["Wallet", "Monitor daily and monthly spending"],
            ["Target", "Set personalized spending limits"],
            ["BarChart3", "Understand where your money goes"],
            ["Sparkles", "Explore AI-powered financial insights"],
            ["TrendingUp", "Build better financial habits"],
          ].map(([i, v]) => (
            <p key={v}>
              <I n={i} /> {v}
            </p>
          ))}
          <div className="actions">
            <button className="link" onClick={() => go("/privacy")}>
              Privacy policy
            </button>
            <button className="link" onClick={() => go("/terms")}>
              Terms & conditions
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
export function Permissions() {
  const { s, set, toast } = useApp();
  return (
    <section className="panel">
      <h2>Permission preferences</h2>
      <p>Allow notifications so FINORA can remind you to log expenses and bills, even when the app is closed.</p>
      <div className="listline">
        <b>Notification permission · {s.permission}</b>
        <Btn
          kind="ghost"
          onClick={async () => {
            const r = await native.askNotifyPermission();
            set((p) => ({ ...p, permission: r }));
            toast(r === "Granted" ? "Notifications allowed" : "Notifications blocked – enable them in Android settings");
          }}
        >
          Allow notifications
        </Btn>
      </div>
      {[
        ["Bank notification access", "Optional. Granted separately in Android settings (see Banks & notifications)."],
        ["Usage access", "An Android version may use app-open events for selected spending controls."],
        ["Background activity", "Device battery settings can delay reminders; allow FINORA to run in background."],
      ].map(([k, v]) => (
        <div className="settinginfo" key={k}>
          <strong>{k}</strong>
          <p>{v}</p>
        </div>
      ))}
    </section>
  );
}
export function Onboarding() {
  const { go, set } = useApp(),
    [step, S] = useState(0),
    titles = [
      "Profile setup",
      "Select your bank",
      "Bank notification access",
      "Parent Connect",
      "Daily spending limit",
      "Regular daily expenses",
      "Fixed monthly expenses",
      "Permissions",
    ],
    last = titles.length - 1,
    next = () => {
      if (step === last) {
        set((p) => ({ ...p, ready: true }));
        go("/", { replace: true });
      } else S(step + 1);
    };
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  return (
    <>
      <Title title={titles[step]} sub={"Step " + (step + 1) + " of " + titles.length} />
      <div className="steps">
        {titles.map((v, i) => (
          <i key={v} className={i <= step ? "active" : ""} />
        ))}
      </div>
      {step === 0 ? (
        <ProfileForm only next={next} />
      ) : step === 1 ? (
        <BankSelect />
      ) : step === 2 ? (
        <NotificationAccess embedded />
      ) : step === 3 ? (
        <Integrations waOnly />
      ) : step === 4 ? (
        <>
          <p>How much money do you want to spend daily?</p>
          <ProfileForm budget next={next} />
        </>
      ) : step === 5 || step === 6 ? (
        <Rules key={step} bills={step === 6} embedded />
      ) : (
        <Permissions />
      )}
      <div className="formend">
        <Btn kind="ghost" onClick={() => (step ? S(step - 1) : undefined)} disabled={!step}>
          Back
        </Btn>
        {[1, 2, 3, 5, 6].includes(step) && (
          <Btn kind="ghost" onClick={next}>
            Skip for now
          </Btn>
        )}
        {![0, 4].includes(step) && (
          <Btn onClick={next}>{step === last ? "Open dashboard" : "Continue"}</Btn>
        )}
      </div>
    </>
  );
}
const GROUPS: [string, string[]][] = [
  ["Account", ["Google account", "Profile setup", "Log out"]],
  ["Money", ["Banks & notifications", "Fixed monthly expenses", "Expense reminders", "Savings goals", "Spending control"]],
  ["Family & alerts", ["Parent Connect", "Notification settings"]],
  ["App & privacy", ["Theme", "Privacy policy", "Data export", "Delete my data"]],
];
export function Profile() {
  const { s, set, go, toast } = useApp(),
    [act, A] = useState("");
  function exportData() {
    const u = URL.createObjectURL(
        new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = u;
    a.download = "finora-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 500);
  }
  return (
    <>
      <Title
        title="Profile & settings"
        sub="Manage your account, preferences and data."
      />
      <section className="profhero">
        <span className="profav" style={s.photo ? { backgroundImage: `url(${s.photo})` } : undefined}>{s.photo ? "" : (s.name || "F")[0].toUpperCase()}</span>
        <div>
          <strong>{s.name || "FINORA user"}</strong>
          <small>{s.email}</small>
        </div>
        <div className="profstats">
          <span><b>{s.tx.length}</b>Records</span>
          <span><b>{s.banks?.length || 0}</b>Banks</span>
          <span><b>{s.goals?.length || 0}</b>Goals</span>
        </div>
      </section>
      <ProfileForm />
      {GROUPS.map(([gt, keys]) => (
      <section className="panel" key={gt}>
        <h2>{gt}</h2>
        {[
          [
            "Theme",
            s.dark ? "Dark" : "Light",
            () => set((p) => ({ ...p, dark: !p.dark })),
          ],
          ["Google account", s.email || "Signed in", () => toast("Signed in as " + s.email)],
          ["Notification settings", s.permission, () => go("/preferences")],
          ["Expense reminders", "Manage", () => go("/reminders")],
          ["Fixed monthly expenses", "Manage", () => go("/bills")],
          ["Banks & notifications", "Manage", () => go("/banks")],
          ["Parent Connect", "Manage", () => go("/integrations")],
          ["Savings goals", "Manage", () => go("/goals")],
          ["Spending control", s.control, () => go("/control")],
          ["Privacy policy", "View", () => go("/privacy")],
          ["Profile setup", "Open onboarding", () => go("/onboarding")],
          ["Data export", "Download JSON", exportData],
          ["Delete my data", "Delete", () => A("delete")],
          ["Log out", "Log out", () => A("logout")],
        ].filter(([k]) => (keys as string[]).includes(String(k))).map(([k, v, fn]) => (
          <button
            key={String(k)}
            className="settingbtn"
            onClick={fn as () => void}
          >
            <strong>{String(k)}</strong>
            <span>
              {String(v)} <I n="ChevronRight" size={15} />
            </span>
          </button>
        ))}
      </section>
      ))}
      {act && (
        <Confirm
          text={
            act === "delete"
              ? "Delete all your transactions and profile from this device and the cloud?"
              : "Log out of FINORA?"
          }
          cancel={() => A("")}
          accept={async () => {
            A("");
            try {
              if (act === "delete") {
                await deleteCloud(s.uid);
                localStorage.removeItem("finora-v2-" + s.uid);
                set({ ...emptyState({ uid: s.uid, name: s.name, email: s.email, photo: s.photo }) });
                toast("Your data was deleted");
                go("/onboarding");
              } else await logout();
            } catch {
              toast("Something went wrong. Please try again.");
            }
          }}
        />
      )}
    </>
  );
}
export function Notifications() {
  const { s, set, go } = useApp();
  return (
    <>
      <Title
        title="Notifications"
        sub="Review updates and payment confirmation requests."
      >
        <Btn kind="ghost" icon="Settings2" onClick={() => go("/preferences")}>
          Preferences
        </Btn>
        <Btn
          icon="CheckCheck"
          onClick={() =>
            set((p) => ({
              ...p,
              notes: p.notes.map((n) => ({ ...n, read: true })),
            }))
          }
        >
          Mark all as read
        </Btn>
      </Title>
      <section className="panel">
        {s.notes.map((n) => (
          <div className="rulerow" key={n.id}>
            <span className={"tile " + (n.read ? "" : "mint")}>
              <I n="Bell" />
            </span>
            <button
              className="rowdesc plain"
              onClick={() => {
                set((p) => ({
                  ...p,
                  notes: p.notes.map((x) =>
                    x.id === n.id ? { ...x, read: true } : x,
                  ),
                }));
                go(n.to);
              }}
            >
              <strong>
                {n.title} {!n.read && <i className="dot" />}
              </strong>
              <small>
                {n.body} · {n.date}
              </small>
            </button>
            <IconBtn
              n="Trash2"
              label="Delete notification"
              click={() =>
                set((p) => ({
                  ...p,
                  notes: p.notes.filter((x) => x.id !== n.id),
                }))
              }
            />
          </div>
        ))}
        {!s.notes.length && <Empty>No notifications yet.</Empty>}
      </section>
    </>
  );
}
export function Assistant() {
  const { s, f } = useApp(),
    m = summary(s),
    top = cats
      .map((c) => ({ c, n: total(m.month.filter((t) => t.category === c)) }))
      .sort((a, b) => b.n - a.n)[0],
    [q, Q] = useState(""),
    [msgs, M] = useState<{ q: string; a: string }[]>([]),
    w = total(m.debits.filter((t) => t.date >= dateKey(offset(-6)))),
    prev = total(
      m.debits.filter(
        (t) => t.date >= dateKey(offset(-13)) && t.date < dateKey(offset(-6)),
      ),
    );
  async function ask(v: string) {
    if (!v.trim()) return;
    Q("");
    M((p) => [...p, { q: v, a: "Thinking…" }]);
    const a = await services.ai.askRemote(v, s, f);
    M((p) => { const n = [...p]; for (let i = n.length - 1; i >= 0; i--) if (n[i].q === v && n[i].a === "Thinking…") { n[i] = { q: v, a }; break; } return n; });
  }
  return (
    <>
      <Title
        title="AI assistant"
        sub="Insights calculated from your own transactions."
      />
      <div className="stats">
        {[
          [
            "Financial health",
            f(m.spent) +
              " spent today against a " +
              f(s.daily) +
              " daily limit.",
          ],
          [
            "Expense analysis",
            top.c +
              " leads at " +
              f(top.n) +
              " this month. This week totals " +
              f(w) +
              " versus " +
              f(prev) +
              " last week.",
          ],
          [
            "Saving opportunities",
            "Reducing " +
              top.c.toLowerCase() +
              " expenses by 10% could save " +
              f(top.n * 0.1) +
              " this month.",
          ],
        ].map(([k, v]) => (
          <section className="panel" key={k}>
            <span className="tile mint">
              <I n="Sparkles" />
            </span>
            <h2>{k}</h2>
            <p>{v}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="sectionhead">
          <h2>Ask Finora</h2>
          <Badge>From your records</Badge>
        </div>
        <p>Explore your spending with a question.</p>
        <div className="actions wrap">
          {[
            "How much did I spend today?",
            "How much did I spend on food this month?",
            "Which category costs me the most?",
            "How much money did I save this month?",
            "Am I within my daily budget?",
          ].map((x) => (
            <Btn key={x} kind="ghost" onClick={() => ask(x)}>
              {x}
            </Btn>
          ))}
        </div>
        <div aria-live="polite">
          {msgs.map((x, i) => (
            <div className="chat" key={i}>
              <strong>{x.q}</strong>
              <p>
                <I n="Sparkles" size={15} /> {x.a}
              </p>
            </div>
          ))}
        </div>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input
            aria-label="Question"
            required
            placeholder="Ask about your spending…"
            value={q}
            onChange={(e) => Q(e.target.value)}
          />
          <Btn type="submit" icon="ArrowRight">
            Send
          </Btn>
        </form>
      </section>
    </>
  );
}
