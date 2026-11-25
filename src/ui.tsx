import React, { createContext, useContext } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  Film,
  Globe,
  HeartPulse,
  House,
  LayoutDashboard,
  Link2,
  ListFilter,
  Menu,
  MessageCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  TrainFront,
  User,
  Utensils,
  Wallet,
  X,
  Zap,
  Clock3,
  MoreHorizontal,
  Landmark,
  SlidersHorizontal,
  ArrowRight,
  Target,
  Download,
  Trash2,
  LogOut,
  Moon,
  CheckCheck,
  Search,
  ChevronDown,
  Pencil,
  Pause,
  Play,
  Info,
  Fingerprint,
  TrendingUp,
  ScanLine,
} from "lucide-react";
import { State, Tx, money } from "./model";
import { useNavigate } from "react-router-dom";
const icons = {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  Film,
  Globe,
  HeartPulse,
  House,
  LayoutDashboard,
  Link2,
  ListFilter,
  Menu,
  MessageCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  TrainFront,
  User,
  Utensils,
  Wallet,
  X,
  Zap,
  Clock3,
  MoreHorizontal,
  Landmark,
  SlidersHorizontal,
  ArrowRight,
  Target,
  Download,
  Trash2,
  LogOut,
  Moon,
  CheckCheck,
  Search,
  ChevronDown,
  Pencil,
  Pause,
  Play,
  Info,
  Fingerprint,
  TrendingUp,
  ScanLine,
};
export const I = ({
  n,
  size = 18,
  ...props
}: {
  n: string;
  size?: number;
  className?: string;
}) => {
  const Icon = icons[n as keyof typeof icons] || Wallet;
  return <Icon size={size} strokeWidth={1.8} {...props} />;
};
export function Mark() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#086658" />
      <g fill="none" stroke="#c7f597" strokeWidth="4.3" strokeLinecap="round">
        <path d="M10 27l7-15M17 27l7-15M24 27l5-10" />
      </g>
    </svg>
  );
}
export const C = createContext<{
  s: State;
  set: React.Dispatch<React.SetStateAction<State>>;
  toast: (v: string) => void;
}>({} as any);
export function useApp() {
  const v = useContext(C);
  return {
    ...v,
    f: (n: number, d = 0) => money(n, v.s.currency, d),
    go: useNavigate(),
  };
}
export const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="badge">{children}</span>
);
export function Btn({
  children,
  onClick,
  kind = "",
  icon,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: string;
  icon?: string;
  type?: "submit" | "button";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={"btn " + kind}
      onClick={onClick}
    >
      {icon && <I n={icon} size={16} />} {children}
    </button>
  );
}
export function IconBtn({
  n,
  label,
  click,
}: {
  n: string;
  label: string;
  click: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="iconbtn"
      onClick={click}
    >
      <I n={n} />
    </button>
  );
}
export function Title({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="pagetitle">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="actions">{children}</div>
    </header>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="empty">
    <I n="ReceiptText" size={26} />
    <p>{children}</p>
  </div>
);
export const catIcon: Record<string, string> = {
  Food: "Utensils",
  Travel: "TrainFront",
  Shopping: "ShoppingBag",
  Bills: "ReceiptText",
  Entertainment: "Film",
  Education: "BookOpen",
  Health: "HeartPulse",
  Income: "BriefcaseBusiness",
};
export const palette = [
  "#087d69",
  "#a9d581",
  "#f0bd68",
  "#91abc8",
  "#b79acd",
  "#ed987f",
  "#89c6c1",
  "#a4ada9",
];
export const srcLabel = (t: Tx) =>
  t.source === "notification" ? "Bank notification" : t.source === "bank" ? "Authorized import" : t.source === "reminder" ? "Reminder" : "Manual";
export function Row({ t }: { t: Tx }) {
  const { go, f } = useApp();
  return (
    <button className="txrow" onClick={() => go("/transaction/" + t.id)}>
      <span className={"tile c" + t.category}>
        <I n={catIcon[t.category] || "Wallet"} />
      </span>
      <span className="rowdesc">
        <strong>{t.title}</strong>
        <small>
          {t.category} · {t.time} · {srcLabel(t)}
        </small>
      </span>
      <span className="rowamt">
        <b className={t.type === "credit" ? "positive" : ""}>
          {t.type === "credit" ? "+" : "−"}
          {f(t.amount)}
        </b>
        <small>{t.confidence !== undefined && t.recon === "auto" ? "Auto-imported" : "Completed"}</small>
      </span>
      <I n="ChevronRight" size={15} />
    </button>
  );
}
export function Contours() {
  return (
    <svg
      className="contours"
      viewBox="0 0 360 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {Array.from({ length: 44 }, (_, i) => (
        <path
          key={i}
          d={`M ${53 + i * 4} -30 C ${240 + i * 3} 16 ${55 + i * 5} 78 ${160 + i * 3} 112 S ${331 + i * 3} 122 ${215 + i * 4} 250`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
        />
      ))}
    </svg>
  );
}
