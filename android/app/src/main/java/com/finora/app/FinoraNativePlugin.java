package com.finora.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "FinoraNative")
public class FinoraNativePlugin extends Plugin {
    private static FinoraNativePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    static void pingJs() {
        if (instance != null) instance.notifyListeners("bankNotification", new JSObject());
    }

    @PluginMethod
    public void isNotificationAccessEnabled(PluginCall call) {
        Context c = getContext();
        boolean on = NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.getPackageName());
        JSObject r = new JSObject();
        r.put("enabled", on);
        call.resolve(r);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    /** Only these packages are ever read by the notification listener. */
    @PluginMethod
    public void setAllowedPackages(PluginCall call) {
        JSArray arr = call.getArray("packages");
        Set<String> set = new HashSet<>();
        try {
            if (arr != null) for (int i = 0; i < arr.length(); i++) set.add(arr.getString(i));
        } catch (Exception ignored) {
        }
        BankNotificationService.getPrefs(getContext()).edit()
            .putStringSet(BankNotificationService.KEY_PACKAGES, set).apply();
        call.resolve();
    }

    /**
     * banks: [{id, packages:[...], keywords:[...]}]
     * Returns ONLY installed apps that match a supported bank (known package or label keyword).
     * The rest of the installed-app list is never read out or stored.
     */
    @PluginMethod
    public void getInstalledBankApps(PluginCall call) {
        JSArray banks = call.getArray("banks");
        JSArray out = new JSArray();
        PackageManager pm = getContext().getPackageManager();
        Set<String> seen = new HashSet<>();
        try {
            Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> launchers = pm.queryIntentActivities(main, 0);
            for (int b = 0; banks != null && b < banks.length(); b++) {
                JSONObject bank = banks.getJSONObject(b);
                String id = bank.getString("id");
                JSONArray pk = bank.optJSONArray("packages");
                JSONArray kw = bank.optJSONArray("keywords");
                for (int i = 0; pk != null && i < pk.length(); i++) {
                    String p = pk.getString(i);
                    try {
                        pm.getPackageInfo(p, 0);
                        if (seen.add(id + p)) out.put(entry(id, p, pm.getApplicationLabel(pm.getApplicationInfo(p, 0)).toString()));
                    } catch (PackageManager.NameNotFoundException ignored) {
                    }
                }
                for (ResolveInfo ri : launchers) {
                    String label = ri.loadLabel(pm).toString();
                    String p = ri.activityInfo.packageName;
                    for (int k = 0; kw != null && k < kw.length(); k++) {
                        if (label.toLowerCase(Locale.ROOT).contains(kw.getString(k).toLowerCase(Locale.ROOT))) {
                            if (seen.add(id + p)) out.put(entry(id, p, label));
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            call.reject(e.getMessage());
            return;
        }
        JSObject r = new JSObject();
        r.put("apps", out);
        call.resolve(r);
    }

    private JSObject entry(String bankId, String pkg, String label) {
        JSObject o = new JSObject();
        o.put("bankId", bankId);
        o.put("pkg", pkg);
        o.put("label", label);
        return o;
    }

    /** Returns queued, already-filtered notifications and clears the queue. */
    @PluginMethod
    public void drainQueue(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("items", new JSArray(BankNotificationService.drain(getContext()).toString()));
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void clearQueue(PluginCall call) {
        BankNotificationService.getPrefs(getContext()).edit().putString(BankNotificationService.KEY_QUEUE, "[]").apply();
        call.resolve();
    }
}
