import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Resolve Firebase configuration parameters dynamically.
// These are loaded securely from environment variables, falls back to build-time applet config.
declare const __FIREBASE_APPLET_CONFIG__: any;

const metaEnv = (import.meta as any).env || {};
const buildTimeConfig = typeof __FIREBASE_APPLET_CONFIG__ !== "undefined" ? __FIREBASE_APPLET_CONFIG__ : {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || buildTimeConfig.apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || buildTimeConfig.authDomain || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || buildTimeConfig.projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || buildTimeConfig.storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || buildTimeConfig.messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || buildTimeConfig.appId || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || buildTimeConfig.firestoreDatabaseId || "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
