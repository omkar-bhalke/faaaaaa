import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAdditionalUserInfo, getAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, persistentLocalCache, writeBatch } from "firebase/firestore";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";
import { emptyState, type State, type Tx } from "./model";

// Client-side Firebase config (from google-services.json). These identify the project; access is
// protected by Firestore rules + Authentication, not by hiding these values.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_WEB_API_KEY || "AIzaSyBRyS7ycVW1UOaU1Wie79vAaNZ2pA4fnd0",
  appId: import.meta.env.VITE_FIREBASE_WEB_APP_ID || "1:464765983636:android:c8f9b199742f517c85cd81",
  projectId: "finoraaaaaa",
  storageBucket: "finoraaaaaa.firebasestorage.app",
  messagingSenderId: "464765983636",
  authDomain: "finoraaaaaa.firebaseapp.com",
});
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });

export type AuthUser = { uid: string; name: string; email: string; photo: string };
const toUser = (u: User): AuthUser => ({ uid: u.uid, name: u.displayName || "", email: u.email || "", photo: u.photoURL || "" });

export function watchAuth(cb: (u: AuthUser | null) => void) {
  return onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
}
export const localKey = (uid: string) => "finora-v2-" + uid;

export async function googleSignIn() {
  const result = Capacitor.isNativePlatform()
    ? await signInWithCredential(auth, await nativeGoogleCredential())
    : await signInWithPopup(auth, new GoogleAuthProvider());

  // A confirmed first sign-in can start setup even if Firestore is unavailable.
  if (getAdditionalUserInfo(result)?.isNewUser) {
    const user = toUser(result.user);
    try {
      if (!localStorage.getItem(localKey(user.uid))) {
        localStorage.setItem(localKey(user.uid), JSON.stringify(emptyState(user)));
      }
    } catch {}
  }
}
async function nativeGoogleCredential() {
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("Google did not return a sign-in token.");
  return GoogleAuthProvider.credential(idToken);
}
export async function logout() {
  if (Capacitor.isNativePlatform()) {
    try { await FirebaseAuthentication.signOut(); } catch {}
  }
  await signOut(auth);
}
export const authMessage = (e: unknown) => {
  const m = String((e as any)?.message || e || "");
  if (/cancel/i.test(m)) return "Sign-in was cancelled.";
  if (/network/i.test(m)) return "No internet connection. Please try again.";
  if (/\b10\b|developer.error/i.test(m)) return "Google sign-in is not configured for this build (add the app's SHA-1 in Firebase, then re-download google-services.json).";
  return "Sign-in failed. " + m;
};

// ---- Cloud sync: users/{uid} (profile + settings) and users/{uid}/transactions/{id} ----
const strip = (s: State) => {
  const { tx, ...rest } = s;
  return { ...rest, nlog: s.nlog.slice(0, 50), seen: s.seen.slice(-300) };
};
export async function loadCloud(uid: string): Promise<State | null> {
  const p = await getDoc(doc(db, "users", uid));
  if (!p.exists()) return null;
  const t = await getDocs(collection(db, "users", uid, "transactions"));
  return { ...(p.data() as Omit<State, "tx">), tx: t.docs.map((d) => d.data() as Tx) } as State;
}
export async function saveCloud(uid: string, prev: State | null, next: State) {
  const batch0 = writeBatch(db);
  batch0.set(doc(db, "users", uid), strip(next));
  await batch0.commit();
  const before = new Map((prev?.tx || []).map((t) => [t.id, JSON.stringify(t)]));
  let b = writeBatch(db), n = 0;
  const flushers: Promise<void>[] = [];
  const bump = () => { if (++n >= 400) { flushers.push(b.commit()); b = writeBatch(db); n = 0; } };
  for (const t of next.tx) if (before.get(t.id) !== JSON.stringify(t)) { b.set(doc(db, "users", uid, "transactions", t.id), JSON.parse(JSON.stringify(t))); bump(); }
  const now = new Set(next.tx.map((t) => t.id));
  for (const id of before.keys()) if (!now.has(id)) { b.delete(doc(db, "users", uid, "transactions", id)); bump(); }
  if (n) flushers.push(b.commit());
  await Promise.all(flushers);
}
export async function deleteCloud(uid: string) {
  const t = await getDocs(collection(db, "users", uid, "transactions"));
  let b = writeBatch(db), n = 0;
  for (const d of t.docs) { b.delete(d.ref); if (++n >= 400) { await b.commit(); b = writeBatch(db); n = 0; } }
  await b.commit();
  await deleteDoc(doc(db, "users", uid));
}
