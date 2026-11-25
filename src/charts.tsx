import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { dateKey, offset, parse, total, cats, Tx } from "./model";
import { useApp, palette, I, Empty, Field, Title } from "./ui";
export function Trend({
  data,
  target,
  kind = "Area",
}: {
  data: { label: string; value: number }[];
  target?: number;
  kind?: string;
}) {
  const { f } = useApp();
  const axes = (
    <>
      <CartesianGrid
        vertical={false}
        stroke="var(--line)"
        strokeDasharray="3 4"
      />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 11, fill: "var(--muted)" }}
        minTickGap={16}
        dy={7}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 10, fill: "var(--muted)" }}
        tickFormatter={(n) =>
          n >= 1000 ? Math.round(n / 100) / 10 + "k" : String(n)
        }
        width={36}
      />
      <Tooltip
        formatter={(v) => [f(Number(v)), "Spending"]}
        contentStyle={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          color: "var(--fg)",
        }}
      />
      {target && (
        <ReferenceLine
          y={target}
          stroke="#aab7ae"
          strokeDasharray="5 5"
          ifOverflow="extendDomain"
        />
      )}
    </>
  );
  const margin = { left: 0, right: 12, top: 12, bottom: 3 };
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "Bar" ? (
          <BarChart data={data} margin={margin}>
            {axes}
            <Bar dataKey="value" fill="#268e77" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : kind === "Line" ? (
          <LineChart data={data} margin={margin}>
            {axes}
            <Line
              dataKey="value"
              type="monotone"
              stroke="#15806a"
              strokeWidth={3}
            />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={margin}>
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#59ad91" stopOpacity=".38" />
                <stop offset="1" stopColor="#59ad91" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {axes}
            <Area
              dataKey="value"
              type="monotone"
              stroke="#16866c"
              strokeWidth={3}
              fill="url(#area)"
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
export function series(tx: Tx[], n: number, end = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = offset(i - n + 1, end);
    return {
      label: d.toLocaleDateString(
        "en-GB",
        n === 7 ? { weekday: "short" } : { day: "numeric", month: "short" },
      ),
      value: total(tx.filter((t) => t.date === dateKey(d))),
    };
  });
}
export function Allocation({ tx }: { tx: Tx[] }) {
  const { f } = useApp(),
    data = cats
      .map((name, i) => ({
        name,
        value: total(tx.filter((t) => t.category === name)),
        color: palette[i],
      }))
      .filter((v) => v.value)
      .sort((a, b) => b.value - a.value),
    sum = total(tx);
  return data.length ? (
    <div className="allocation">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius="72%"
              outerRadius="98%"
              dataKey="value"
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((v) => (
                <Cell key={v.name} fill={v.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => f(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div>
          <small>Total spent</small>
          <b>{f(sum)}</b>
        </div>
      </div>
      <div className="legend">
        {data.map((v) => (
          <div key={v.name}>
            <span>
              <i style={{ background: v.color }} />
              {v.name}
            </span>
            <b>{Math.round((v.value / sum) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty>No spending in this period.</Empty>
  );
}
export function Analytics() {
  const { s, f } = useApp(),
    [period, P] = useState("Weekly"),
    [end, E] = useState(dateKey()),
    [cat, K] = useState("All"),
    [kind, G] = useState("Area");
  const d = parse(end),
    days =
      period === "Yearly"
        ? 365
        : period === "Monthly"
          ? new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
          : 7,
    start =
      period === "Yearly"
        ? new Date(d.getFullYear(), 0, 1)
        : period === "Monthly"
          ? new Date(d.getFullYear(), d.getMonth(), 1)
          : offset(-((d.getDay() + 6) % 7), d),
    finish =
      period === "Yearly"
        ? new Date(d.getFullYear(), 11, 31)
        : offset(days - 1, start),
    pool = s.tx.filter(
      (t) => t.type === "debit" && (cat === "All" || t.category === cat),
    ),
    tx = pool.filter(
      (t) => t.date >= dateKey(start) && t.date <= dateKey(finish),
    ),
    data =
      period === "Yearly"
        ? Array.from({ length: 12 }, (_, i) => ({
            label: new Date(2000, i, 1).toLocaleDateString("en", {
              month: "short",
            }),
            value: total(tx.filter((t) => parse(t.date).getMonth() === i)),
          }))
        : series(tx, days, finish),
    rank = [...data].sort((a, b) => b.value - a.value),
    sum = total(tx),
    previous = total(
      pool.filter(
        (t) =>
          t.date < dateKey(start) && t.date >= dateKey(offset(-days, start)),
      ),
    ),
    income = total(
      s.tx.filter(
        (t) =>
          t.type === "credit" &&
          t.date >= dateKey(start) &&
          t.date <= dateKey(finish),
      ),
    );
  return (
    <>
      <Title
        title="Spending analytics"
        sub="Explore the patterns in your demo ledger."
      />
      <div className="panel">
        <div className="filters">
          <div className="seg">
            {["Daily", "Weekly", "Monthly", "Yearly"].map((x) => (
              <button
                className={x === period ? "on" : ""}
                onClick={() => P(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <Field label="Period containing">
            <input
              type="date"
              required
              value={end}
              onChange={(e) => e.target.value && E(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <select value={cat} onChange={(e) => K(e.target.value)}>
              {["All", ...cats].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div className="stats">
        {[
          ["Total spending", f(sum)],
          ["Daily average", f(sum / days)],
          ["Prior period", f(previous)],
          ["Income less expenses", f(income - sum)],
        ].map(([k, v]) => (
          <div className="panel" key={k}>
            <small>{k}</small>
            <h2>{v}</h2>
          </div>
        ))}
      </div>
      <div className="twocol">
        <section className="panel">
          <div className="sectionhead">
            <h2>Spending trend</h2>
            <select value={kind} onChange={(e) => G(e.target.value)}>
              {["Area", "Line", "Bar"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <Trend
            data={data}
            kind={kind}
            target={period === "Daily" ? s.daily : undefined}
          />
          <p className="muted">
            Highest · {rank[0].label} {f(rank[0].value)}　 Lowest ·{" "}
            {rank.at(-1)?.label} {f(rank.at(-1)?.value || 0)}
          </p>
        </section>
        <section className="panel">
          <h2>Category breakdown</h2>
          <Allocation tx={tx} />
        </section>
      </div>
      <section className="panel">
        <h2>Budget utilization</h2>
        <p>
          {f(sum)} of{" "}
          {f(
            period === "Yearly"
              ? s.monthly * 12
              : period === "Monthly"
                ? s.monthly
                : s.daily * days,
          )}{" "}
          · Fixed expenses paid {f(total(tx.filter((t) => t.fixed)))}
        </p>
      </section>
    </>
  );
}
