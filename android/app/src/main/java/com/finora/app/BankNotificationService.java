package com.finora.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Listens ONLY to notifications from the bank apps the user selected in FINORA.
 * Everything else is ignored immediately. OTP / PIN / password messages are discarded
 * before anything is stored. Eligible text stays on the device (queue) until the app
 * parses it; only structured transaction fields are synced to the cloud by the app.
 */
public class BankNotificationService extends NotificationListenerService {
    static final String PREFS = "finora_native";
    static final String KEY_PACKAGES = "allowed_packages";
    static final String KEY_QUEUE = "queue";
    static final String TEST_PREFIX = "FINORA TEST";

    private static final Pattern SENSITIVE = Pattern.compile(
        "(?i)\\b(otp|one[- ]?time|verification code|passcode|password|cvv|mpin|m-pin|upi pin|do not share|never share)\\b");
    private static final Pattern MONEY = Pattern.compile(
        "(?i)(rs\\.?|inr|\\u20B9)\\s*[0-9]|\\b(debited|credited|withdrawn|deposited)\\b");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Context ctx = getApplicationContext();
            String pkg = sbn.getPackageName();
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            Bundle ex = n.extras;
            CharSequence t = ex.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence tx = ex.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (tx == null) tx = ex.getCharSequence(Notification.EXTRA_TEXT);
            String title = t == null ? "" : t.toString();
            String text = tx == null ? "" : tx.toString();

            boolean test = pkg.equals(ctx.getPackageName());
            if (test) {
                if (!(title + text).startsWith(TEST_PREFIX)) return; // never read our own other notifications
            } else {
                Set<String> allowed = getPrefs(ctx).getStringSet(KEY_PACKAGES, new HashSet<String>());
                if (!allowed.contains(pkg)) return; // not a selected bank app -> ignore
                if (SENSITIVE.matcher(title + " " + text).find()) return; // discard OTP/PIN etc.
                if (!MONEY.matcher(title + " " + text).find()) return; // not a transaction
            }

            JSONObject o = new JSONObject();
            o.put("id", pkg + ":" + sbn.getPostTime() + ":" + Math.abs((title + text).hashCode()));
            o.put("pkg", pkg);
            o.put("title", title);
            o.put("text", text);
            o.put("ts", sbn.getPostTime());
            o.put("test", test);
            push(ctx, o);
            FinoraNativePlugin.pingJs();
        } catch (Exception ignored) {
        }
    }

    static SharedPreferences getPrefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void push(Context c, JSONObject o) throws Exception {
        SharedPreferences p = getPrefs(c);
        JSONArray a = new JSONArray(p.getString(KEY_QUEUE, "[]"));
        for (int i = 0; i < a.length(); i++)
            if (a.getJSONObject(i).optString("id").equals(o.optString("id"))) return;
        a.put(o);
        JSONArray cut = new JSONArray();
        for (int i = Math.max(0, a.length() - 200); i < a.length(); i++) cut.put(a.get(i));
        p.edit().putString(KEY_QUEUE, cut.toString()).apply();
    }

    static synchronized JSONArray drain(Context c) throws Exception {
        SharedPreferences p = getPrefs(c);
        JSONArray a = new JSONArray(p.getString(KEY_QUEUE, "[]"));
        p.edit().putString(KEY_QUEUE, "[]").apply();
        return a;
    }
}
