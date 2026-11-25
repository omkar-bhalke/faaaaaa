import { useState } from "react";
import { useApp, I, IconBtn, Title, Btn, Contours, Row, Empty } from "./ui";
import { dateKey, summary, total, offset } from "./model";
import { bankById } from "./banks";
import { useSync } from "./bankui";
import { Trend, series, Allocation } from "./charts";
export function Home() {
  const { s, set, f, go, toast } = useApp(),
    m = summary(s),
    sync = useSync(),
    primary = s.banks.find((b) => b.primary),
    [visible, V] = useState(true),
    [days, D] = useState(7),
    [period, P] = useState("This month"),
    pct = s.daily ? Math.round((m.spent / s.daily) * 100) : 0,
    left = s.daily - m.spent,
    mp = s.monthly ? Math.round((m.monthly / s.monthly) * 100) : 0,
    tx = [...s.tx].sort((a, b) =>
      (b.date + b.time).localeCompare(a.date + a.time),
    ),
    imported = (t: "debit" | "credit") =>
      s.tx.filter((x) => x.source === "notification" && x.type === t && x.date >= dateKey(offset(-6))).length,
    chart = series(m.debits, days),
    sum = chart.reduce((a, b) => a + b.value, 0),
    group =
      period === "This month"
        ? m.month
        : m.debits.filter((t) => t.date === dateKey());
  return (
    <>
      <Title
        title={"Hello, " + s.name.split(" ")[0] + " 👋"}
        sub="Here’s your financial overview for today."
      >
        <Btn
          icon="CalendarDays"
          kind="datepill"
          onClick={() => go("/analytics")}
        >
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Btn>
        <Btn icon="Plus" onClick={() => go("/expense")}>
          Add expense
        </Btn>
      </Title>
      <div className="cards">
        <section className="bankcard">
          <Contours />
          <div className="balancehead">
            <span>
              <I n="Wallet" /> Available balance
            </span>
            <IconBtn
              n={visible ? "Eye" : "EyeOff"}
              label="Toggle balance visibility"
              click={() => V(!visible)}
            />
          </div>
          <div className="banknum">{visible ? f(m.balance, 2) : "••••••"}</div>
          <div className="accountno">
            <I n="Landmark" size={14} />{" "}
            {primary ? bankById(primary.id)?.name : "No bank selected"} <b>{primary?.account || "Your records"}</b>
          </div>
          <div className="bankfoot">
            <span>
              <i />
              {primary?.packages.length ? "Notification tracking on" : "Bank not connected · calculated from your records"}
            </span>
            <button title={"Updated " + new Date(s.sync).toLocaleString()} onClick={() => sync()}>
              <I n="RefreshCw" size={13} /> Refresh
            </button>
          </div>
        </section>
        <section className="panel budget">
          <div className="cardlabel">
            <span className="tile mint">
              <I n="Target" />
            </span>
            Daily spending
          </div>
          <div className="dailywrap">
            <div>
              <div className="big">{f(m.spent)}</div>
              <small>of {f(s.daily)} limit</small>
            </div>
            <div
              className="ring"
              style={{
                background: `conic-gradient(${pct >= 100 ? "#d66b58" : pct >= 80 ? "#d9a24f" : "#16836b"} ${Math.min(100, pct)}%,var(--track) 0)`,
              }}
            >
              <b>{pct}%</b>
            </div>
          </div>
          <div className="budgetfoot">
            <i className="dot" />
            {f(Math.abs(left))} {left >= 0 ? "remaining" : "over limit"}
          </div>
        </section>
        <section className="panel budget">
          <div className="cardlabel">
            <span className="tile lilac">
              <I n="CalendarDays" />
            </span>
            Monthly budget
          </div>
          <div className="big">{f(m.monthly)}</div>
          <small>of {f(s.monthly)} budget</small>
          <div className="meter">
            <i style={{ width: Math.min(100, mp) + "%" }} />
          </div>
          <div className="budgetfoot">
            {mp}% used{" "}
            <b>
              {f(Math.abs(s.monthly - m.monthly))}{" "}
              {s.monthly >= m.monthly ? "left" : "over"}
            </b>
          </div>
        </section>
      </div>
      <div className="chartgrid">
        <section className="panel">
          <div className="sectionhead">
            <h2>Spending activity</h2>
            <select
              aria-label="Activity range"
              value={days}
              onChange={(e) => D(+e.target.value)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="chartval">
            {f(sum)} <small>total spent</small>
          </div>
          <Trend data={chart} />
        </section>
        <section className="panel">
          <div className="sectionhead">
            <h2>Categories</h2>
            <select
              aria-label="Category period"
              value={period}
              onChange={(e) => P(e.target.value)}
            >
              <option>This month</option>
              <option>Today</option>
            </select>
          </div>
          <Allocation tx={group} />
        </section>
      </div>
      <section className="panel">
        <div className="sectionhead">
          <h2>Bank notifications</h2>
          <button className="link" onClick={() => go("/notification-access")}>
            Manage <I n="ArrowRight" size={14} />
          </button>
        </div>
        <div className="listline"><span>New debits (7 days)</span><b>{imported("debit")}</b></div>
        <div className="listline"><span>New credits (7 days)</span><b>{imported("credit")}</b></div>
        <div className="listline"><span>Imported transactions</span><b>{s.tx.filter((t) => t.source === "notification").length}</b></div>
        <div className="listline"><span>Needs review</span><b>{s.review.length}</b></div>
        <div className="listline"><span>Last synchronization</span><b>{new Date(s.sync).toLocaleString()}</b></div>
      </section>
      <div className="insight">
        <div className="spark">
          <I n="Sparkles" size={23} />
        </div>
        <div>
          <div className="kicker">FINORA INSIGHT</div>
          <strong>
            {left >= 0
              ? "You’re within your daily budget."
              : "Your daily spending limit has been reached."}
          </strong>
          <p>
            {left >= 0
              ? f(left) +
                " remains available for today’s discretionary spending."
              : "Review today’s purchases and your spending controls."}
          </p>
        </div>
        <button
          aria-label="Explore AI insights"
          onClick={() => go("/assistant")}
        >
          <I n="ArrowRight" />
        </button>
      </div>
      <div className="chartgrid">
        <section className="panel">
          <div className="sectionhead">
            <h2>Recent transactions</h2>
            <button className="link" onClick={() => go("/transactions")}>
              View all <I n="ArrowRight" size={14} />
            </button>
          </div>
          {tx.slice(0, 4).map((t) => (
            <Row key={t.id} t={t} />
          ))}
          {!tx.length && <Empty>No transactions yet. Add an expense or enable bank notifications.</Empty>}
        </section>
        <section className="panel">
          <h2>Quick actions</h2>
          <div className="quick">
            {[
              ["Plus", "Add expense", "expense"],
              ["ReceiptText", "History", "transactions"],
              ["BarChart3", "Analytics", "analytics"],
              ["Sparkles", "AI insights", "assistant"],
              ["CalendarDays", "Monthly bills", "bills"],
              ["ShieldCheck", "Spending control", "control"],
              ["MessageCircle", "Parent Connect", "integrations"],
              ["Target", "Savings goals", "goals"],
              ["Landmark", "Banks", "banks"],
            ].map(([i, v, p]) => (
              <button key={p} onClick={() => go("/" + p)}>
                <I n={i} />
                {v}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
