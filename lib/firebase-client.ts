import { getFirebaseAuth } from "./firebase";

// Client-safe: config is read through lib/firebase.ts, which only touches public NEXT_PUBLIC_* vars.
export function getClientAuth() {
  return getFirebaseAuth();
}
