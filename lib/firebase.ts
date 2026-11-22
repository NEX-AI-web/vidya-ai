import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import { initializeFirestore, type Firestore } from "firebase/firestore";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";

import { getStorage, type FirebaseStorage } from "firebase/storage";

// Nothing Firebase-related runs at import time. Every SDK object is created
// lazily through the getters below, so prerendering without NEXT_PUBLIC_FIREBASE_*
// env vars no longer throws auth/invalid-api-key.
//
// Env vars are read with literal property access so Next.js can inline them.

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Only these keys are required; storageBucket and messagingSenderId are optional.
export function getMissingFirebaseConfigKeys(): string[] {
  const config = getFirebaseConfig();
  const missing: string[] = [];
  if (!config.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!config.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!config.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!config.appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  return missing;
}

// Returns human-readable problems with the Firebase config. Only variable NAMES
// appear in the output; config values are never included in any message.
export function getFirebaseConfigProblems(): string[] {
  const problems: string[] = [];
  for (const name of getMissingFirebaseConfigKeys()) {
    problems.push("Missing: " + name);
  }

  const config = getFirebaseConfig();

  if (config.apiKey && !/^AIza[0-9A-Za-z_-]{35}$/.test(config.apiKey)) {
    problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_API_KEY");
  }

  const projectIdValid = !!config.projectId && /^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(config.projectId);
  if (config.projectId && !projectIdValid) {
    problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  if (config.appId && !/^1:\d+:web:[0-9a-f]+$/.test(config.appId)) {
    problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_APP_ID");
  }

  if (config.authDomain) {
    const authDomain = config.authDomain;
    let authDomainValid = true;
    if (/^https?:\/\//i.test(authDomain) || authDomain.includes("/")) {
      authDomainValid = false;
    }
    if (authDomainValid && authDomain.endsWith(".firebaseapp.com") && projectIdValid) {
      const firstLabel = authDomain.split(".")[0];
      if (firstLabel !== config.projectId) {
        authDomainValid = false;
      }
    }
    if (!authDomainValid) {
      problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
    }
  }

  if (config.messagingSenderId && !/^\d+$/.test(config.messagingSenderId)) {
    problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  }

  if (config.storageBucket && config.storageBucket.startsWith("gs://")) {
    problems.push("Invalid format: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  }

  return problems;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfigProblems().length === 0;
}

function assertFirebaseConfigured(): void {
  const problems = getFirebaseConfigProblems();
  if (problems.length > 0) {
    throw new Error("Firebase is not configured. " + problems.join("; "));
  }
}

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let authReadyPromise: Promise<Auth> | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let googleProviderInstance: GoogleAuthProvider | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    assertFirebaseConfigured();
    appInstance = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseAuthReady(): Promise<Auth> {
  if (!authReadyPromise) {
    const auth = getFirebaseAuth();
    authReadyPromise =
      typeof window !== "undefined"
        ? setPersistence(auth, browserLocalPersistence).then(() => auth)
        : Promise.resolve(auth);
  }
  return authReadyPromise;
}

// Firestore long-polling helps on networks where normal streaming is blocked.
// This must be the first Firestore initialization in the application.
export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(getFirebaseApp(), {
      experimentalAutoDetectLongPolling: true,
    });
  }
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    googleProviderInstance = provider;
  }
  return googleProviderInstance;
}
