import { useEffect, useState } from "react";
import { useApp, I, Btn, Title, Badge, Empty, Field } from "./ui";
import { BANKS, SelectedBank, bankById } from "./banks";
import { native, isNative } from "./native";
import { ingest, confirmReview, bankName } from "./engine";
import { cats, uid } from "./model";

/** Drain native queue -> parse -> ledger. Safe to call anywhere. */
export function useSync() {
  const { set, toast } = useApp();
  return async (quiet = false) => {
    const raws = await native.drain();
    if (!raws.length) { if (!quiet) toast("No new bank notifications."); return; }
    set((p) => {
      const r = ingest(p, raws);
      if (!quiet || r.saved || r.review) setTimeout(() => toast(r.saved + " saved · " + r.review + " need review"), 0);
      return r.state;
    });
  };
}

const logo = (id: string) => {
  const b = bankById(id)!;
  return (
    <span className="tile" style={{ background: b.color + "22", color: b.color, fontWeight: 700, fontSize: 12 }}>
      {b.short.slice(0, 4)}
    </span>
  );
};

export function BankSelect({ onChange }: { onChange?: () => void }) {
  const { s, set } = useApp(), [q, Q] = useState(""), [busy, B] = useState(false);
  const sel = (id: string) => s.banks.find((b) => b.id === id);
  async function refreshDetect(ids: string[]) {
    B(true);
    const apps = await native.detect(ids);
    set((p) => {
      const banks = p.banks.map((b) => {
        const found = apps.filter((a) => a.bankId === b.id).map((a) => ({ pkg: a.pkg, label: a.label }));
        // keep packages the user already confirmed, drop ones no longer installed
        return { ...b, detected: found, packages: b.packages.filter((x) => found.some((f) => f.pkg === x)) };
      });
      native.setPackages(banks);
      return { ...p, banks };
    });
    B(false);
  }
  function toggle(id: string) {
    const next: SelectedBank[] = sel(id)
      ? s.banks.filter((b) => b.id !== id)
      : [...s.banks, { id, primary: !s.banks.length, packages: [], detected: [], account: "" }];
    if (next.length && !next.some((b) => b.primary)) next[0] = { ...next[0], primary: true };
    set((p) => ({ ...p, banks: next, bankDone: true }));
    native.setPackages(next);
    refreshDetect(next.map((b) => b.id));
    onChange?.();
  }
  const list = BANKS.filter((b) => (b.name + b.short).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <section className="panel">
        <p>Choose your bank to configure FINORA’s supported transaction tracking and financial notification features.</p>
        <p><small>Selecting a bank does not connect your account. Balances shown in FINORA are calculated from your records.</small></p>
        <input aria-label="Search banks" placeholder="Search bank names…" value={q} onChange={(e) => Q(e.target.value)} />
        {list.map((b) => {
          const x = sel(b.id);
          return (
            <div className="rulerow" key={b.id}>
              {logo(b.id)}
              <button className="rowdesc plain" onClick={() => toggle(b.id)}>
                <strong>{b.name} {x?.primary && <Badge>Primary</Badge>}</strong>
                <small>
                  {x ? "Selected" : "Not selected"} · {x ? (x.detected.length ? "App detected" : isNative() ? "App not detected" : "Detection needs the Android app") : b.methods[0]}
                  {x ? " · Account authorization: not configured" : ""}
                </small>
              </button>
              {x && !x.primary && (
                <Btn kind="ghost" onClick={() => set((p) => ({ ...p, banks: p.banks.map((y) => ({ ...y, primary: y.id === b.id })) }))}>Make primary</Btn>
              )}
              <Btn kind={x ? "" : "ghost"} icon={x ? "Check" : "Plus"} onClick={() => toggle(b.id)}>{x ? "Selected" : "Select"}</Btn>
            </div>
          );
        })}
        {!list.length && <Empty>No bank matches your search.</Empty>}
        {busy && <small>Checking installed bank apps…</small>}
      </section>
      {!!s.banks.length && <DetectedApps />}
    </>
  );
}

export function DetectedApps() {
  const { s, set } = useApp();
  const pick = (bankId: string, pkg: string) =>
    set((p) => {
      const banks = p.banks.map((b) => b.id !== bankId ? b : { ...b, packages: b.packages.includes(pkg) ? b.packages.filter((x) => x !== pkg) : [...b.packages, pkg] });
      native.setPackages(banks);
      return { ...p, banks };
    });
  return (
    <section className="panel">
      <h2>Banking apps detected</h2>
      <p><small>FINORA reads notifications only from the bank apps you tick here.</small></p>
      {s.banks.map((b) => (
        <div key={b.id}>
          <strong>{bankName(b.id)}</strong>
          {b.detected.length ? b.detected.map((d) => (
            <label className="listline" key={d.pkg}>
              <span>{d.label} <small>({d.pkg})</small></span>
              <input type="checkbox" checked={b.packages.includes(d.pkg)} onChange={() => pick(b.id, d.pkg)} />
            </label>
          )) : <p><small>{isNative() ? "No installed app found for this bank." : "Available in the Android app."}</small></p>}
        </div>
      ))}
    </section>
  );
}

export function NotificationAccess({ embedded = false }: { embedded?: boolean }) {
  const { s, set, toast, go } = useApp(), sync = useSync(), [on, O] = useState(false);
  const check = async () => O(await native.accessEnabled());
  useEffect(() => {
    check();
    const v = () => document.visibilityState === "visible" && (check(), sync(true));
    document.addEventListener("visibilitychange", v);
    const off = native.onNew(() => sync(true));
    return () => { document.removeEventListener("visibilitychange", v); off(); };
  }, []);
  const last = s.nlog.find((n) => n.result === "saved" || n.result === "review");
  const chosen = s.banks.flatMap((b) => b.packages).length;
  return (
    <>
      {!embedded && <Title title="Bank notification access" sub="Automatically maintain records from eligible bank transaction notifications." />}
      <section className="panel">
        <div className="sectionhead">
          <span className="tile mint"><I n="Bell" /></span>
          <Badge>{!isNative() ? "Android app only" : on ? "Access enabled" : "Access off"}</Badge>
        </div>
        <p>FINORA can identify eligible banking transaction notifications to help you automatically maintain your expense records. It does not need to read your personal conversations or unrelated app notifications.</p>
        <ul>
          <li>Only the bank apps you select are read. Everything else is ignored.</li>
          <li>OTP, PIN and password messages are discarded.</li>
          <li>Raw notification text is not uploaded – only the transaction fields you keep.</li>
          <li>You can switch this off in Android settings any time.</li>
        </ul>
        <div className="actions wrap">
          <Btn icon="ShieldCheck" disabled={!isNative()} onClick={async () => { await native.openSettings(); toast("Turn on FINORA, then come back to the app."); }}>
            Enable Bank Notification Access
          </Btn>
          <Btn kind="ghost" icon="RefreshCw" onClick={async () => { await check(); await sync(); }}>Check now</Btn>
          <Btn kind="ghost" icon="Bell" disabled={!isNative()} onClick={async () => toast((await native.sendTest()) ? "Test notification sent…" : "Allow notifications first.")}>Send test</Btn>
        </div>
        <div className="listline"><span>Selected bank apps</span><b>{chosen}</b></div>
        <div className="listline"><span>Last detected transaction</span><b>{last ? last.summary : "—"}</b></div>
        {on && !chosen && <p role="alert"><small>Select at least one detected bank app below, otherwise nothing is read.</small></p>}
      </section>
      {!embedded && <DetectedApps />}
      {!embedded && (
        <section className="panel">
          <div className="sectionhead">
            <h2>Processing history</h2>
            {!!s.review.length && <Btn onClick={() => go("/review")}>Review {s.review.length}</Btn>}
          </div>
          {s.nlog.map((n) => (
            <div className="listline" key={n.id}>
              <span>{new Date(n.ts).toLocaleString()} · {n.result}</span>
              <b>{n.summary}</b>
            </div>
          ))}
          {!s.nlog.length && <Empty>No notifications processed yet.</Empty>}
          <div className="actions wrap">
            <Btn kind="ghost" icon="Trash2" onClick={() => { set((p) => ({ ...p, tx: p.tx.filter((t) => t.source !== "notification"), review: [], nlog: [] })); toast("Imported records deleted"); }}>Delete imported records</Btn>
          </div>
        </section>
      )}
    </>
  );
}

export function Reconcile() {
  const { s, set, f, toast } = useApp();
  return (
    <>
      <Title title="Review payments" sub="FINORA was not sure about these. Nothing is saved until you confirm." />
      <section className="panel">
        {s.review.map((r) => (
          <div key={r.id} className="panelinner">
            <div className="listline"><span>{bankName(r.bankId)} {r.account || ""}</span><b>{r.type === "credit" ? "+" : "−"}{f(r.amount, 2)}</b></div>
            <small>{new Date(r.ts).toLocaleString()} · {r.reason}</small>
            <div className="filters">
              <Field label="Description"><input defaultValue={r.title} onChange={(e) => (r.title = e.target.value)} /></Field>
              {r.type === "debit" && (
                <Field label="Category">
                  <select defaultValue={r.category || "Others"} onChange={(e) => (r.category = e.target.value)}>
                    {cats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div className="actions wrap">
              <Btn onClick={() => { set((p) => confirmReview(p, r.id, { title: r.title, category: r.type === "credit" ? "Income" : r.category || "Others" })); toast("Saved"); }}>Confirm and save</Btn>
              <Btn kind="ghost" onClick={() => set((p) => ({ ...p, review: p.review.filter((x) => x.id !== r.id) }))}>Ignore</Btn>
            </div>
          </div>
        ))}
        {!s.review.length && <Empty>Nothing needs review.</Empty>}
      </section>
    </>
  );
}

export function Goals() {
  const { s, set, f } = useApp(), [name, N] = useState(""), [target, T] = useState("");
  return (
    <>
      <Title title="Savings goals" sub="Set a target and track what you have saved." />
      <section className="panel">
        {s.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <div key={g.id} className="panelinner">
              <div className="listline"><b>{g.name}</b><span>{f(g.saved)} / {f(g.target)}</span></div>
              <div className="meter"><i style={{ width: pct + "%" }} /></div>
              <div className="actions wrap">
                {[100, 500, 1000].map((a) => (
                  <Btn key={a} kind="ghost" onClick={() => set((p) => ({ ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, saved: x.saved + a } : x)) }))}>+{a}</Btn>
                ))}
                <Btn kind="ghost" icon="Trash2" onClick={() => set((p) => ({ ...p, goals: p.goals.filter((x) => x.id !== g.id) }))}>Delete</Btn>
              </div>
            </div>
          );
        })}
        {!s.goals.length && <Empty>No goals yet. Add your first one below.</Empty>}
      </section>
      <form className="panel formgrid" onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !(Number(target) > 0)) return; set((p) => ({ ...p, goals: [...p.goals, { id: uid(), name: name.trim(), target: Number(target), saved: 0 }] })); N(""); T(""); }}>
        <Field label="Goal name"><input required value={name} onChange={(e) => N(e.target.value)} placeholder="New phone" /></Field>
        <Field label="Target amount"><input required type="number" min="1" value={target} onChange={(e) => T(e.target.value)} /></Field>
        <div className="formend"><Btn type="submit" icon="Plus">Add goal</Btn></div>
      </form>
    </>
  );
}
