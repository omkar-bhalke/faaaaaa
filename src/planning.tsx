import { useState } from "react";
import { useApp, I, Title, Btn, Field, IconBtn, Empty, Badge } from "./ui";
import { rule, Rule, dateKey, summary, uid, cats } from "./model";
import { services, BACKEND_URL } from "./services";
import { bankById } from "./banks";
export function Rules({
  bills = false,
  embedded = false,
}: {
  bills?: boolean;
  embedded?: boolean;
}) {
  const { s, set, f, toast } = useApp(),
    key = bills ? "bills" : "rules",
    items = s[key],
    [edit, E] = useState<Rule | null>(null),
    [confirm, Q] = useState<Rule | null>(null),
    [actual, A] = useState(""),
    [cat, K] = useState(""),
    [del, D] = useState(""),
    month = dateKey().slice(0, 7),
    paid = (id: string) => s.billHistory.includes(month + id);
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit || !edit.title.trim()) return;
    set((p) => ({
      ...p,
      [key]: [
        ...p[key].filter((x) => x.id !== edit.id),
        { ...edit, title: edit.title.trim() },
      ],
    }));
    E(null);
    toast("Saved");
  }
  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm) return;
    const r = confirm,
      today = dateKey(),
      receipt = bills ? month + r.id : today + r.id;
    if (bills ? paid(r.id) : s.handled.includes("posted" + receipt)) {
      toast("Already recorded");
      Q(null);
      return;
    }
    set((p) => ({
      ...p,
      tx: [
        ...p.tx,
        {
          id: uid(),
          title: r.title,
          amount: Number(actual),
          category: cat,
          date: today,
          time: new Date().toTimeString().slice(0, 5),
          type: "debit",
          method: "UPI",
          notes: bills ? "Recurring bill" : "Confirmed reminder",
          fixed: bills,
        },
      ],
      billHistory: bills ? [...p.billHistory, receipt] : p.billHistory,
      handled: [...p.handled, "posted" + receipt],
    }));
    Q(null);
    toast("Payment recorded");
  }
  return (
    <>
      {!embedded && (
        <Title
          title={bills ? "Monthly bills" : "Expense reminders"}
          sub={
            bills
              ? "Manage recurring bills separately from your daily limit."
              : "Confirm routine purchases before adding them to your ledger."
          }
        />
      )}
      <section className="panel">
        <div className="sectionhead">
          <div>
            <h2>{bills ? "Recurring expenses" : "Daily routines"}</h2>
            <small>
              {bills
                ? f(summary(s).fixed) + " scheduled monthly"
                : items.filter((x) => x.enabled).length + " active reminders"}
            </small>
          </div>
          <Btn
            icon="Plus"
            onClick={() =>
              E(rule("", 0, "13:00", 1, bills ? "Monthly" : "Daily"))
            }
          >
            {bills ? "Add bill" : "Add reminder"}
          </Btn>
        </div>
        {items.map((r) => (
          <div className="rulerow" key={r.id}>
            <span className={"tile " + (bills ? "lilac" : "mint")}>
              <I n={bills ? "CalendarDays" : "Clock3"} />
            </span>
            <div className="rowdesc">
              <strong>{r.title}</strong>
              <small>
                {f(r.amount)} · {bills ? "Due day " + r.day : r.time} ·{" "}
                {r.frequency} ·{" "}
                {r.enabled
                  ? bills
                    ? paid(r.id)
                      ? "Paid"
                      : "Pending"
                    : "Active"
                  : "Paused"}
              </small>
            </div>
            <div className="actions">
              <button
                className="link"
                disabled={!r.enabled || (bills && paid(r.id))}
                onClick={() => {
                  Q(r);
                  A(String(r.amount));
                  K(bills ? "Bills" : "");
                }}
              >
                {bills ? "Mark paid" : "Check in"}
              </button>
              <IconBtn
                n={r.enabled ? "Pause" : "Play"}
                label={r.enabled ? "Pause" : "Enable"}
                click={() =>
                  set((p) => ({
                    ...p,
                    [key]: p[key].map((x) =>
                      x.id === r.id ? { ...x, enabled: !x.enabled } : x,
                    ),
                  }))
                }
              />
              <IconBtn n="Pencil" label="Edit" click={() => E({ ...r })} />
              <IconBtn n="Trash2" label="Delete" click={() => D(r.id)} />
            </div>
          </div>
        ))}
        {!items.length && (
          <Empty>Add your first {bills ? "bill" : "reminder"}.</Empty>
        )}
      </section>
      {edit && (
        <div className="overlay">
          <form className="dialog" onSubmit={save}>
            <h2>{bills ? "Monthly bill" : "Expense reminder"}</h2>
            <Field label="Expense name">
              <input
                required
                autoFocus
                value={edit.title}
                onChange={(e) => E({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label="Expected amount">
              <input
                type="number"
                required
                min=".01"
                step=".01"
                value={edit.amount || ""}
                onChange={(e) => E({ ...edit, amount: +e.target.value })}
              />
            </Field>
            {bills ? (
              <Field label="Day of month">
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={edit.day}
                  onChange={(e) => E({ ...edit, day: +e.target.value })}
                />
              </Field>
            ) : (
              <Field label="Allowed amount variation">
                <input
                  type="number"
                  required
                  min="0"
                  value={edit.variation}
                  onChange={(e) => E({ ...edit, variation: +e.target.value })}
                />
              </Field>
            )}
            <Field label="Recurrence">
              <select
                value={edit.frequency}
                onChange={(e) => E({ ...edit, frequency: e.target.value })}
              >
                {(bills ? ["Monthly"] : ["Daily", "Weekdays", "Weekends"]).map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Reminder time">
              <input
                type="time"
                required
                value={edit.time}
                onChange={(e) => E({ ...edit, time: e.target.value })}
              />
            </Field>
            <label>
              <input
                type="checkbox"
                checked={edit.remind}
                onChange={(e) => E({ ...edit, remind: e.target.checked })}
              />{" "}
              Enable reminder
            </label>
            <div className="formend">
              <Btn kind="ghost" onClick={() => E(null)}>
                Cancel
              </Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        </div>
      )}
      {confirm && (
        <div className="overlay">
          <form className="dialog" onSubmit={post}>
            <h2>Did you spend money on {confirm.title}?</h2>
            <Field label="Actual amount">
              <input
                required
                type="number"
                min=".01"
                step=".01"
                value={actual}
                onChange={(e) => A(e.target.value)}
              />
            </Field>
            {Math.abs(Number(actual) - confirm.amount) <= confirm.variation && (
              <p>
                Did you spend {f(Number(actual))} on {confirm.title}?
              </p>
            )}
            {!bills &&
              Math.abs(Number(actual) - confirm.amount) <= confirm.variation &&
              /^(breakfast|lunch|dinner|tea \/ coffee|snacks|transportation)$/i.test(
                confirm.title,
              ) && (
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    K(confirm.title === "Transportation" ? "Travel" : "Food")
                  }
                >
                  Use suggested category ·{" "}
                  {confirm.title === "Transportation" ? "Travel" : "Food"}
                </button>
              )}
            <Field label="Confirm category">
              <select required value={cat} onChange={(e) => K(e.target.value)}>
                <option value="">Select a category</option>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="formend">
              <Btn kind="ghost" onClick={() => Q(null)}>
                Skip
              </Btn>
              <Btn type="submit">Confirm</Btn>
            </div>
          </form>
        </div>
      )}
      {del && (
        <Confirm
          text="Delete this recurring item?"
          cancel={() => D("")}
          accept={() => {
            set((p) => ({ ...p, [key]: p[key].filter((x) => x.id !== del) }));
            D("");
          }}
        />
      )}
    </>
  );
}
export function Confirm({
  text,
  cancel,
  accept,
}: {
  text: string;
  cancel: () => void;
  accept: () => void;
}) {
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true">
        <h2>{text}</h2>
        <div className="formend">
          <Btn kind="ghost" onClick={cancel}>
            Cancel
          </Btn>
          <Btn onClick={accept}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}
export function Integrations({ waOnly = false }: { waOnly?: boolean }) {
  const { s, set, f, toast, go } = useApp(),
    m = summary(s),
    ready = BACKEND_URL !== "";
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      v = (k: string) => String(d.get(k) || "").trim(),
      phone = v("phone").replace(/[\s-]/g, "");
    if (phone && !/^\+?[0-9]{10,14}$/.test(phone)) {
      toast("Enter a valid phone number, e.g. +919876543210");
      return;
    }
    set((p) => ({ ...p, parentName: v("name"), parentPhone: phone, reportOn: d.get("on") === "on", reportTime: v("time") || "21:00" }));
    toast("Parent Connect saved");
  }
  const primary = s.banks.find((b) => b.primary);
  return (
    <>
      {!waOnly && <Title title="Parent Connect" sub="Optionally send a daily spending summary to a parent or guardian on WhatsApp." />}
      <div className={waOnly ? "" : "twocol"}>
        <section className="panel">
          <div className="sectionhead">
            <span className="tile mint">
              <I n="MessageCircle" />
            </span>
            <Badge>{!s.parentPhone ? "Not set up" : ready ? "Report scheduled" : "Saved · delivery not live yet"}</Badge>
          </div>
          <h2>WhatsApp daily report</h2>
          <p>Reports are sent only to the number you enter, only if you turn them on. Your personal conversations are never accessed.</p>
          <form className="formgrid" onSubmit={save}>
            <Field label="Parent / guardian name">
              <input name="name" defaultValue={s.parentName} maxLength={60} />
            </Field>
            <Field label="WhatsApp number (with country code)">
              <input name="phone" inputMode="tel" placeholder="+919876543210" defaultValue={s.parentPhone} />
            </Field>
            <Field label="Send time">
              <input name="time" type="time" defaultValue={s.reportTime} />
            </Field>
            <label>
              <input name="on" type="checkbox" defaultChecked={s.reportOn} /> Send a daily report
            </label>
            {!ready && <small>Report delivery starts once the automation backend is connected. Your settings are saved to your account.</small>}
            <div className="formend">
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        </section>
        {!waOnly && (
          <section className="panel">
            <div className="sectionhead">
              <span className="tile mint">
                <I n="Landmark" />
              </span>
              <Badge>{s.banks.length ? s.banks.length + " selected" : "None selected"}</Badge>
            </div>
            <h2>Bank accounts</h2>
            <p>{primary ? "Primary bank: " + (bankById(primary.id)?.name || primary.id) + "." : "No bank selected yet."}</p>
            <p>
              Balance from your records: <b>{f(m.balance, 2)}</b>
              {primary?.lastBalance && (
                <>
                  <br />
                  <small>Last balance seen in a bank notification: {f(primary.lastBalance.amount, 2)} · {new Date(primary.lastBalance.ts).toLocaleString()}</small>
                </>
              )}
            </p>
            <p><small>Bank balance synchronization requires authorized bank integration.</small></p>
            <Btn onClick={() => go("/banks")}>Manage banks & notifications</Btn>
          </section>
        )}
      </div>
    </>
  );
}
export function Control() {
  const { s, set, f, go } = useApp(),
    m = summary(s),
    [mock, M] = useState(""),
    [ask, A] = useState(false),
    active = services.restrictions.applies(s, mock).data;
  return (
    <>
      <Title
        title="Spending control"
        sub="Try app-specific spending reminders in a simulated Android environment."
      />
      <div className="stats">
        {[
          ["Daily limit", f(s.daily)],
          ["Spent today", f(m.spent)],
          ["Remaining", f(Math.max(0, s.daily - m.spent))],
        ].map(([k, v]) => (
          <div className="panel" key={k}>
            <small>{k}</small>
            <h2>{v}</h2>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>
          {m.spent >= s.daily
            ? "Your daily spending limit has been reached."
            : "Your daily spending is within budget."}
        </h2>
        <Field label="Control mode">
          <select
            value={s.control}
            onChange={(e) =>
              e.target.value === "User-confirmed restriction"
                ? A(true)
                : set((p) => ({ ...p, control: e.target.value }))
            }
          >
            {[
              "Disabled",
              "Reminder",
              "Warning",
              "User-confirmed restriction",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <p>
          Only selected demo apps participate. Phone, emergency, settings and
          accessibility functions stay available.
        </p>
        {["Amazon", "Swiggy", "Zomato", "Flipkart"].map((app) => (
          <div key={app} className="listline">
            <label>
              <input
                type="checkbox"
                checked={s.apps.includes(app)}
                onChange={(e) =>
                  set((p) => ({
                    ...p,
                    apps: e.target.checked
                      ? [...p.apps, app]
                      : p.apps.filter((x) => x !== app),
                  }))
                }
              />{" "}
              {app}
            </label>
            <button className="link" onClick={() => M(app)}>
              Simulate opening
            </button>
          </div>
        ))}
        <div className="formend">
          <Btn
            kind="ghost"
            onClick={() => {
              set((p) => ({ ...p, control: "Disabled" }));
              M("");
            }}
          >
            Disable control
          </Btn>
          <Btn onClick={() => go("/")}>Return to dashboard</Btn>
        </div>
      </section>
      {ask && (
        <Confirm
          text="Enable reversible demo restrictions for selected apps?"
          cancel={() => A(false)}
          accept={() => {
            set((p) => ({ ...p, control: "User-confirmed restriction" }));
            A(false);
          }}
        />
      )}
      {mock && (
        <div className="overlay">
          <div className="dialog">
            <Badge>App simulation</Badge>
            <h2>{mock}</h2>
            <p>
              {active
                ? s.control + " · Your daily spending limit has been reached."
                : "This demo app opens normally."}
            </p>
            <p>
              {f(m.spent)} spent of {f(s.daily)} today.
            </p>
            <Btn onClick={() => M("")}>
              {active ? "Emergency override / continue" : "Close"}
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
