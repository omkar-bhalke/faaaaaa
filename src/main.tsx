import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
} from "react-router-dom";
import { C, useApp, I, Mark, Title, Badge, IconBtn, Btn, Empty } from "./ui";
import { emptyState, normalize, State, dateKey, uid } from "./model";
import { watchAuth, loadCloud, saveCloud, logout, localKey, AuthUser } from "./firebase";
import { native } from "./native";
import { BankSelect, NotificationAccess, Reconcile, Goals, useSync } from "./bankui";
import { Home } from "./home";
import { Analytics } from "./charts";
import { Expense, Transactions, Detail } from "./transactions";
import { Rules, Integrations, Control } from "./planning";
import {
  Profile,
  Notifications,
  Assistant,
  Welcome,
  Onboarding,
  Permissions,
} from "./account";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as NativeApp } from "@capacitor/app";
import "./style.css";
const main = [
    ["Overview", "LayoutDashboard", "/"],
    ["Transactions", "ArrowLeftRight", "/transactions"],
    ["Analytics", "ChartNoAxesCombined", "/analytics"],
    ["AI assistant", "Sparkles", "/assistant"],
  ],
  manage = [
    ["Monthly bills", "CalendarDays", "/bills"],
    ["Reminders", "Clock3", "/reminders"],
    ["Spending control", "ShieldCheck", "/control"],
    ["Banks & notifications", "Landmark", "/banks"],
    ["Savings goals", "Target", "/goals"],
    ["Parent Connect", "MessageCircle", "/integrations"],
  ],
  account = [
    ["Notifications", "Bell", "/notifications"],
    ["Settings", "Settings2", "/profile"],
  ];
function Legal({ k }: { k: string }) {
  const { go, s } = useApp();
  return (
    <>
      <Title title={k === "privacy" ? "Privacy policy" : "Terms & conditions"} />
      <section className="panel">
        <p>
          {k === "privacy"
            ? "FINORA stores your profile, transactions and preferences in your private Firebase account (only you can read them). Bank notifications are read only from the bank apps you select; OTP, PIN and password messages are discarded and raw notification text is not uploaded. We never ask for bank credentials, OTPs or sessions. You can export or delete your data in settings."
            : "FINORA helps you track and understand your spending. Balances are calculated from your records unless an authorized bank integration is connected. Notification tracking depends on your bank app generating notifications. You control which entries are saved."}
        </p>
        <Btn onClick={() => go(s.uid ? "/profile" : "/")}>Back</Btn>
      </section>
    </>
  );
}
function Shell() {
  const { s, set, go } = useApp(),
    loc = useLocation(),
    [mobile, B] = useState(false),
    unread = s.notes.filter((v) => !v.read).length;
  useEffect(() => {
    B(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const label =
    [...main, ...manage, ...account].find((x) => x[2] === loc.pathname)?.[0] ||
    {
      "/welcome": "Welcome",
      "/onboarding": "Profile setup",
      "/expense": "Add expense",
      "/review": "Review payments",
      "/notification-access": "Bank notification access",
      "/privacy": "Privacy",
      "/terms": "Terms",
      "/preferences": "Preferences",
    }[loc.pathname] ||
    "Transaction details";
  return (
    <div className={"app " + (s.dark ? "dark" : "")}>
      {mobile && (
        <button
          aria-label="Close navigation"
          className="scrim"
          onClick={() => B(false)}
        />
      )}
      <aside className={mobile ? "show" : ""}>
        <button className="brand" onClick={() => go("/")}>
          <Mark />
          Finora<span>.</span>
        </button>
        <div className="sidegroups">
          {[
            ["WORKSPACE", main],
            ["MONEY TOOLS", manage],
            ["ACCOUNT", account],
          ].map(([name, items]) => (
            <div key={String(name)}>
              <div className="navlabel">{String(name)}</div>
              {(items as string[][]).map(([v, i, p]) => (
                <NavLink end to={p} key={p}>
                  <I n={i} />
                  {v}
                  {p === "/notifications" && unread > 0 && <em>{unread}</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebottom">
          <div className="demo">
            <i className="dot" />
            Cloud sync on
          </div>
          <button onClick={() => go("/profile")} className="person">
            <span className="avatar">{s.name.charAt(0)}</span>
            <span>
              <strong>{s.name}</strong>
              <small>Personal account</small>
            </span>
            <I n="ChevronRight" size={15} />
          </button>
        </div>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="crumb">
            <button
              className="hamb"
              onClick={() => B(true)}
              aria-label="Open navigation"
            >
              <I n="Menu" />
            </button>
            <I n="House" size={16} />
            <span>/</span> {label}
          </div>
          <div className="actions">
            <span className="live">
              <i className="dot" />
              Live data
            </span>
            <IconBtn
              n={s.dark ? "Sun" : "Moon"}
              label="Change theme"
              click={() => set((p) => ({ ...p, dark: !p.dark }))}
            />
            <div className="bell">
              <IconBtn
                n="Bell"
                label="Notifications"
                click={() => go("/notifications")}
              />
              {unread > 0 && <i />}
            </div>
            <button
              className="avatar sm"
              aria-label="Profile and settings"
              onClick={() => go("/profile")}
              style={s.photo ? { backgroundImage: `url(${s.photo})`, backgroundSize: "cover", color: "transparent" } : undefined}
            >
              {s.name.charAt(0)}
            </button>
          </div>
        </div>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/expense" element={<Expense key="add" />} />
            <Route
              path="/expense/:id"
              element={<Expense key={loc.pathname} />}
            />
            <Route path="/review" element={<Reconcile />} />
            <Route path="/banks" element={<><Title title="Banks & notifications" sub="Choose your banks and manage notification tracking." /><BankSelect /><NotificationAccess embedded /><section className="panel"><Btn onClick={() => go("/notification-access")}>Open notification access</Btn></section></>} />
            <Route path="/notification-access" element={<NotificationAccess />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transaction/:id" element={<Detail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/bills" element={<Rules key="bills" bills />} />
            <Route path="/reminders" element={<Rules key="reminders" />} />
            <Route path="/control" element={<Control />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/preferences"
              element={
                <>
                  <Title title="Notification preferences" />
                  <section className="panel">
                    <label>
                      <input
                        type="checkbox"
                        checked={s.alerts}
                        onChange={(e) =>
                          set((p) => ({ ...p, alerts: e.target.checked }))
                        }
                      />{" "}
                      Enable spending alerts and reminders
                    </label>
                  </section>
                  <Permissions />
                </>
              }
            />
            {["privacy", "terms"].map((k) => (
              <Route key={k} path={"/" + k} element={<Legal k={k} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <nav className="bottomnav">
        {[...main, ["Profile", "User", "/profile"]].map(([v, i, p]) => (
          <NavLink key={p} end to={p}>
            <I n={i} />
            {p === "/" ? "Home" : v}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function NativeSync() {
  const sync = useSync();
  useEffect(() => {
    sync(true);
    const off = native.onNew(() => sync(true));
    const v = () => document.visibilityState === "visible" && sync(true);
    document.addEventListener("visibilitychange", v);
    return () => {
      off();
      document.removeEventListener("visibilitychange", v);
    };
  }, []);
  return null;
}
function readDeviceProfile(user: AuthUser) {
  try {
    const raw = localStorage.getItem(localKey(user.uid));
    return raw ? normalize(JSON.parse(raw), user) : null;
  } catch { return null; }
}
function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>();
  useEffect(() => watchAuth(setUser), []);
  return <Session key={user?.uid ?? (user === undefined ? "loading" : "guest")} user={user} />;
}

function Session({ user }: { user: AuthUser | null | undefined }) {
  const [s, setS] = useState<State | null>(null),
    [issue, J] = useState(""),
    [msg, T] = useState(""),
    [attempt, retry] = useState(0),
    [loadFailed, setLoadFailed] = useState(false),
    prev = useRef<State | null>(null),
    chain = useRef<Promise<unknown>>(Promise.resolve());
  const set: React.Dispatch<React.SetStateAction<State>> = (fn) =>
    setS((p) => (p ? (typeof fn === "function" ? (fn as (x: State) => State)(p) : fn) : p));
  useEffect(() => {
    if (!user) return;
    const account = user;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setLoadFailed(false);
    async function openProfile() {
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Profile request timed out")), 8000);
        });
        const cloud = await Promise.race([loadCloud(account.uid), timeout]);
        if (!active) return;
        const state = cloud ? normalize(cloud, account) : readDeviceProfile(account) || emptyState(account);
        prev.current = cloud ? state : null;
        setS(state);
      } catch {
        if (!active) return;
        const local = readDeviceProfile(account);
        if (local) {
          prev.current = local;
          setS(local);
          J("Opened the profile saved on this device. Cloud storage is unavailable.");
        } else {
          setLoadFailed(true);
        }
      } finally {
        clearTimeout(timer);
      }
    }
    void openProfile();
    return () => { active = false; clearTimeout(timer); };
  }, [user, attempt]);

  // Persist the device copy immediately, including the last onboarding step.
  useEffect(() => {
    if (!s || !user) return;
    try {
      localStorage.setItem(localKey(user.uid), JSON.stringify(s));
    } catch {}
    if (prev.current === s) return;
    const persist = () => {
      const snap = s;
      chain.current = chain.current.then(() =>
        saveCloud(user.uid, prev.current, snap)
          .then(() => {
            prev.current = snap;
          })
          .catch(() => J("Changes saved on this device. Cloud sync will retry.")),
      );
    };
    if (s.ready && !prev.current?.ready) {
      persist();
      return;
    }
    const id = setTimeout(persist, 900);
    return () => clearTimeout(id);
  }, [s, user]);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => T(""), 4500);
    return () => clearTimeout(id);
  }, [msg]);
  // 4) real scheduled reminders (work when the app is closed)
  useEffect(() => {
    if (s) native.scheduleReminders(s.rules, s.bills, s.alerts && s.permission === "Granted");
  }, [s?.rules, s?.bills, s?.alerts, s?.permission]);
  // 5) in-app reminder notices while the app is open
  useEffect(() => {
    function tick() {
      set((p) => {
        if (!p.alerts || p.permission !== "Granted") return p;
        const now = new Date(),
          d = dateKey(),
          time = now.toTimeString().slice(0, 5),
          wd = now.getDay(),
          weekend = wd === 0 || wd === 6;
        const due = [
          ...p.rules.map((r) => ({ r, b: false })),
          ...p.bills.map((r) => ({ r, b: true })),
        ].filter(
          ({ r, b }) =>
            r.enabled &&
            r.remind &&
            r.time === time &&
            !p.handled.includes(d + r.id) &&
            (b
              ? Math.min(r.day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) === now.getDate()
              : r.frequency === "Daily" || (r.frequency === "Weekends") === weekend),
        );
        if (!due.length) return p;
        return {
          ...p,
          handled: [...p.handled, ...due.map((x) => d + x.r.id)],
          notes: [
            ...due.map(({ r, b }) => ({
              id: uid(),
              title: b ? r.title + " bill due" : "Did you spend money on " + r.title + "?",
              body: "Review and confirm the actual amount.",
              date: d,
              to: b ? "/bills" : "/reminders",
              read: false,
            })),
            ...p.notes,
          ],
        };
      });
    }
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);
  const loading = user === undefined || (!!user && !s);
  const guest = emptyState({ uid: "", name: "", email: "", photo: "" });
  return (
    <C.Provider value={{ s: s || guest, set: set, toast: T }}>
      {loading ? (
        <div className="splash" role="status">
          <Mark />
          <h1>Finora.</h1>
          {loadFailed ? (
            <>
              <p>Your profile could not be loaded. Check your connection and try again.</p>
              <Btn onClick={() => { setLoadFailed(false); retry(attempt + 1); }}>Try again</Btn>
              <button onClick={() => logout().catch(() => T("Could not sign out. Try again."))}>Sign out</button>
            </>
          ) : (
            <><p>{user ? "Opening your profile…" : "Opening Finora…"}</p><i /></>
          )}
        </div>
      ) : s ? (
        <>
          {s.ready ? <Shell /> : (
            <div className={"app entry " + (s.dark ? "dark" : "")}>
              <main>
                <Routes>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/privacy" element={<Legal k="privacy" />} />
                  <Route path="/terms" element={<Legal k="terms" />} />
                  <Route path="*" element={<Navigate to="/onboarding" replace />} />
                </Routes>
              </main>
            </div>
          )}
          <NativeSync />
        </>
      ) : (
        <div className="app entry">
          <div className="content">
            <main>
              <Routes>
                <Route path="/privacy" element={<Legal k="privacy" />} />
                <Route path="/terms" element={<Legal k="terms" />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="*" element={<Navigate to="/welcome" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
      {(msg || issue) && (
        <button
          role="status"
          className="toast"
          onClick={() => {
            T("");
            J("");
          }}
        >
          {msg || issue}　×
        </button>
      )}
    </C.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
const isNat = Capacitor.isNativePlatform();
if (isNat) {
  document.documentElement.classList.add("native");
  // Android back button: go back in history, exit only from the home screen
  NativeApp.addListener("backButton", () => {
    const h = location.hash;
    if (h === "" || h === "#/" || h === "#/welcome") NativeApp.exitApp();
    else history.back();
  });
  // Match status bar to theme (dark/light) set by the app
  const syncBar = () => {
    const dark = !!document.querySelector(".app.dark");
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: dark ? "#192720" : "#ffffff" }).catch(() => {});
  };
  new MutationObserver(syncBar).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  syncBar();
}
if (!isNat && import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(
      "/sw.js?v=" + encodeURIComponent(import.meta.url.split("/").pop() || "1"),
    )
    .catch(() => {});
}
