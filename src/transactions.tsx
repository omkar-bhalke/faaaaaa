import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp, I, Btn, Title, Field, Row, Empty, srcLabel } from "./ui";
import { bankName } from "./engine";
import { BANKS } from "./banks";
import { dateKey, Tx, cats, uid, summary } from "./model";
export function Expense() {
  const { s, set, go, toast, f } = useApp(),
    { id } = useParams(),
    old = s.tx.find((t) => t.id === id),
    [error, E] = useState("");
  if (id && !old) return <Empty>Transaction unavailable.</Empty>;
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      v = (k: string) => String(data.get(k) || "").trim(),
      t: Tx = {
        id: old?.id || uid(),
        title: v("title"),
        amount: Number(v("amount")),
        date: v("date"),
        time: v("time"),
        type: old?.type || "debit",
        category: v("category"),
        method: v("method"),
        notes: v("notes"),
        fixed: old?.fixed,
        source: old?.source || "manual",
        bankId: old?.bankId,
        account: old?.account,
        ref: old?.ref,
        confidence: old?.confidence,
        recon: old?.recon,
      };
    if (!t.title || !(t.amount > 0) || !t.category) {
      E("Enter a title, positive amount and category.");
      return;
    }
    if (
      s.tx.some(
        (x) =>
          x.id !== old?.id &&
          (x.id === t.id ||
            (x.title.toLowerCase() === t.title.toLowerCase() &&
              x.date === t.date &&
              x.time === t.time &&
              x.amount === t.amount &&
              x.type === t.type)),
      )
    ) {
      E("This transaction is already in your ledger.");
      return;
    }
    set((p) => {
      const next = {
        ...p,
        tx: [...p.tx.filter((x) => x.id !== t.id), t],
      };
      if (
        p.alerts &&
        summary(p).spent < p.daily &&
        summary(next).spent >= p.daily
      )
        next.notes = [
          {
            id: uid(),
            title: "Daily limit reached",
            body: "Review your spending controls.",
            to: "/control",
            date: dateKey(),
            read: false,
          },
          ...p.notes,
        ];
      return next;
    });
    toast("Expense saved");
    go("/transactions");
  }
  return (
    <>
      <Title
        title={old ? "Edit transaction" : "Add expense"}
        sub="Record a payment in your personal ledger."
      />
      <form className="panel formgrid" onSubmit={save}>
        <Field label="Amount">
          <input
            name="amount"
            type="number"
            step=".01"
            min=".01"
            required
            defaultValue={old?.amount}
            placeholder="0.00"
          />
        </Field>
        <Field label="Expense title">
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={old?.title}
            placeholder="e.g. Lunch"
          />
        </Field>
        <Field label="Category">
          <select name="category" required defaultValue={old?.category || ""}>
            <option value="">Choose category</option>
            {(old?.type === "credit" ? ["Income"] : cats).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Payment method">
          <select name="method" defaultValue={old?.method || "UPI"}>
            {["UPI", "Cash", "Debit card", "Credit card", "Bank transfer"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </Field>
        <Field label="Date">
          <input
            required
            name="date"
            type="date"
            max={dateKey()}
            defaultValue={old?.date || dateKey()}
          />
        </Field>
        <Field label="Time">
          <input
            required
            name="time"
            type="time"
            defaultValue={old?.time || new Date().toTimeString().slice(0, 5)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            defaultValue={old?.notes}
            placeholder="Optional"
          />
        </Field>
        {error && <p role="alert">{error}</p>}
        <div className="formend">
          <Btn kind="ghost" onClick={() => go("/transactions")}>
            Cancel
          </Btn>
          <Btn type="submit">
            Save expense
          </Btn>
        </div>
      </form>
    </>
  );
}
export function Detail() {
  const { s, f, go } = useApp(),
    { id } = useParams(),
    t = s.tx.find((x) => x.id === id);
  return t ? (
    <>
      <Title title={t.title} sub="Transaction details" />
      <section className="panel">
        <h1>
          {t.type === "credit" ? "+" : "−"}
          {f(t.amount)}
        </h1>
        {Object.entries({
          Status: t.recon === "auto" ? "Auto-imported" : t.recon === "user-confirmed" ? "Confirmed by you" : "Completed",
          Source: srcLabel(t),
          ...(t.bankId ? { Bank: bankName(t.bankId) } : {}),
          ...(t.account ? { Account: t.account } : {}),
          ...(t.ref ? { Reference: t.ref } : {}),
          ...(t.confidence !== undefined ? { Confidence: Math.round(t.confidence * 100) + "%" } : {}),
          Type: t.type,
          Category: t.category,
          Date: t.date,
          Time: t.time,
          "Payment method": t.method,
          Notes: t.notes || "—",
          "Transaction ID": t.id,
        }).map(([k, v]) => (
          <div className="listline" key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
        <Btn icon="Pencil" onClick={() => go("/expense/" + id)}>
          Edit transaction
        </Btn>
      </section>
    </>
  ) : (
    <Empty>Transaction unavailable.</Empty>
  );
}
export function Transactions() {
  const { s, go } = useApp(),
    [search, S] = useState(""),
    [type, T] = useState("All"),
    [cat, K] = useState("All"),
    [from, F] = useState(""),
    [to, U] = useState(""),
    [min, M] = useState(""),
    [max, X] = useState(""),
    [src, SR] = useState("All"),
    [bank, BK] = useState("All"),
    [sort, O] = useState("Newest"),
    [more, B] = useState(false),
    [count, N] = useState(30),
    tx = s.tx
      .filter(
        (x) =>
          x.title.toLowerCase().includes(search.toLowerCase()) &&
          (type === "All" || type === x.type) &&
          (cat === "All" || cat === x.category) &&
          (src === "All" || srcLabel(x) === src) &&
          (bank === "All" || x.bankId === bank) &&
          x.date >= (from || "0") &&
          x.date <= (to || "9999") &&
          x.amount >= Number(min) &&
          x.amount <= (max ? Number(max) : Infinity),
      )
      .sort(
        (a, b) =>
          (sort === "Newest" ? 1 : -1) *
          (b.date + b.time).localeCompare(a.date + a.time),
      );
  return (
    <>
      <Title title="Transactions" sub="Search and review your transactions.">
        <Btn icon="Plus" onClick={() => go("/expense")}>
          Add expense
        </Btn>
      </Title>
      {s.review.length > 0 && (
        <button className="noticebar" onClick={() => go("/review")}>
          <I n="ScanLine" />
          {s.review.length} bank payment{s.review.length > 1 ? "s" : ""} need your review <I n="ChevronRight" />
        </button>
      )}
      <section className="panel">
        <div className="filters">
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => S(e.target.value)}
          />
          <select
            aria-label="Transaction type"
            value={type}
            onChange={(e) => T(e.target.value)}
          >
            {["All", "debit", "credit"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => O(e.target.value)}
          >
            <option>Newest</option>
            <option>Oldest</option>
          </select>
          <Btn kind="ghost" icon="ListFilter" onClick={() => B(!more)}>
            Filters
          </Btn>
        </div>
        {more && (
          <div className="filters">
            <Field label="Category">
              <select value={cat} onChange={(e) => K(e.target.value)}>
                {["All", "Income", ...cats].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select value={src} onChange={(e) => SR(e.target.value)}>
                {["All", "Manual", "Bank notification", "Authorized import", "Reminder"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Bank">
              <select value={bank} onChange={(e) => BK(e.target.value)}>
                <option value="All">All</option>
                {BANKS.filter((b) => s.banks.some((y) => y.id === b.id)).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            {[
              ["From", "date", from, F],
              ["To", "date", to, U],
              ["Min amount", "number", min, M],
              ["Max amount", "number", max, X],
            ].map(([k, t, v, fn]) => (
              <Field label={String(k)} key={String(k)}>
                <input
                  type={String(t)}
                  value={String(v)}
                  onChange={(e) => (fn as (s: string) => void)(e.target.value)}
                />
              </Field>
            ))}
          </div>
        )}
        {tx.slice(0, count).map((x, i) => (
          <div key={x.id}>
            {(!i || x.date.slice(0, 7) !== tx[i - 1].date.slice(0, 7)) && (
              <h3 className="groupname">
                {new Date(x.date + "T12:00").toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
            )}
            <Row t={x} />
          </div>
        ))}
        {!tx.length && <Empty>No matching transactions.</Empty>}
        {tx.length > count && (
          <Btn kind="ghost" onClick={() => N(count + 30)}>
            Load more
          </Btn>
        )}
      </section>
    </>
  );
}
