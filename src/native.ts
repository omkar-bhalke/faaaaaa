import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { BANKS, SelectedBank } from "./banks";
import { RawNotification } from "./parsers";
import type { Rule } from "./model";

type Native = {
  isNotificationAccessEnabled(): Promise<{ enabled: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  setAllowedPackages(o: { packages: string[] }): Promise<void>;
  getInstalledBankApps(o: { banks: { id: string; packages: string[]; keywords: string[] }[] }): Promise<{ apps: { bankId: string; pkg: string; label: string }[] }>;
  drainQueue(): Promise<{ items: RawNotification[] }>;
  clearQueue(): Promise<void>;
  addListener(ev: "bankNotification", fn: () => void): Promise<{ remove: () => void }>;
};
const plugin = registerPlugin<Native>("FinoraNative");
export const isNative = () => Capacitor.isNativePlatform();
export const native = {
  async accessEnabled() {
    if (!isNative()) return false;
    try { return (await plugin.isNotificationAccessEnabled()).enabled; } catch { return false; }
  },
  openSettings: () => (isNative() ? plugin.openNotificationAccessSettings() : Promise.resolve()),
  async setPackages(banks: SelectedBank[]) {
    if (isNative()) await plugin.setAllowedPackages({ packages: banks.flatMap((b) => b.packages) });
  },
  async detect(ids: string[]) {
    if (!isNative()) return [];
    const banks = BANKS.filter((b) => ids.includes(b.id)).map((b) => ({ id: b.id, packages: b.packages, keywords: b.keywords }));
    try { return (await plugin.getInstalledBankApps({ banks })).apps; } catch { return []; }
  },
  async drain() {
    if (!isNative()) return [];
    try { return (await plugin.drainQueue()).items; } catch { return []; }
  },
  clear: () => (isNative() ? plugin.clearQueue() : Promise.resolve()),
  onNew(fn: () => void) {
    if (!isNative()) return () => {};
    const h = plugin.addListener("bankNotification", fn);
    return () => { h.then((x) => x.remove()); };
  },
  async askNotifyPermission() {
    if (!isNative()) {
      if (typeof Notification === "undefined") return "Denied";
      return (await Notification.requestPermission()) === "granted" ? "Granted" : "Denied";
    }
    const r = await LocalNotifications.requestPermissions();
    return r.display === "granted" ? "Granted" : "Denied";
  },
  async sendTest() {
    if (!isNative()) return false;
    const ok = (await LocalNotifications.checkPermissions()).display === "granted" || (await native.askNotifyPermission()) === "Granted";
    if (!ok) return false;
    await LocalNotifications.schedule({ notifications: [{ id: 9001, title: "FINORA TEST", body: "FINORA TEST – notification access check", schedule: { at: new Date(Date.now() + 1500) } }] });
    return true;
  },
  // Real reminders (work even when the app is closed)
  async scheduleReminders(rules: Rule[], bills: Rule[], enabled: boolean) {
    if (!isNative()) return;
    try {
      const pending = await LocalNotifications.getPending();
      const mine = pending.notifications.filter((n) => n.id >= 10000 && n.id < 20000);
      if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
      if (!enabled || (await LocalNotifications.checkPermissions()).display !== "granted") return;
      const hash = (s: string) => 10000 + (Math.abs([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 9000);
      const list = [
        ...rules.filter((r) => r.enabled && r.remind).map((r) => ({ r, bill: false })),
        ...bills.filter((r) => r.enabled && r.remind).map((r) => ({ r, bill: true })),
      ];
      await LocalNotifications.schedule({
        notifications: list.map(({ r, bill }) => {
          const [h, m] = r.time.split(":").map(Number);
          return {
            id: hash(r.id),
            title: bill ? r.title + " bill due" : "Did you spend money on " + r.title + "?",
            body: "Open FINORA to review and confirm the actual amount.",
            schedule: bill
              ? { on: { day: Math.min(r.day, 28), hour: h, minute: m }, allowWhileIdle: true }
              : { on: { hour: h, minute: m }, allowWhileIdle: true },
          };
        }),
      });
    } catch {}
  },
};
