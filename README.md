# FINORA (React + Capacitor Android app)

## One-time Firebase setup (project `finoraaaaaa`)
1. Authentication → Sign-in method → enable **Google**.
2. Project settings → Your apps → Android `com.finora.app` → **Add fingerprint** → paste SHA-1:
   `58:F9:BA:0A:19:83:D9:19:3E:7D:AD:8A:34:06:AF:27:7B:2A:0C:20`
   (debug key committed at `android/app/finora-debug.keystore`; same key on every build.)
3. Download the new `google-services.json` and replace `android/app/google-services.json` (and the keys in `src/firebase.ts` if they change).
4. Firestore Database → Create database → Rules → paste `firestore.rules` → Publish.
5. The account picker uses the Android configuration. Firebase Auth and Firestore run in the WebView. If the Android API key has a package restriction, set `VITE_FIREBASE_WEB_API_KEY` and `VITE_FIREBASE_WEB_APP_ID` at build time from a Firebase Web app registered in the same project. Allow the WebView origin `https://localhost` for any web referrer restriction.

## Build the APK
Push to GitHub → Actions → **Build Android APK** → download artifact `Finora-apk`.
Local: `npm install && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`.

## Structure
- `src/services.ts` – `BACKEND_URL` (Render) goes here later.
- `src/banks.ts`, `src/parsers.ts`, `src/engine.ts` – bank registry, notification parsers, dedupe/reconcile.
- `android/app/src/main/java/com/finora/app/` – `BankNotificationService` + `FinoraNativePlugin` (native notification listener).
- `src/firebase.ts` – Google sign-in + Firestore sync (`users/{uid}`, `users/{uid}/transactions/{id}`).

## Backend (Render)
Set `VITE_BACKEND_URL=https://<your-service>.onrender.com` at build time (GitHub Actions: repo Variables → add and pass in the build step). The AI assistant then answers via the server; without it, it falls back to local answers. Server code lives in the separate FINOR-RABDER repo.
