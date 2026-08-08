import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFunctions, type Functions } from 'firebase/functions';

// Helper to safely get env vars in both Vite (import.meta.env) and Next.js (process.env)
const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : ''),
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : ''),
    databaseURL: import.meta.env?.VITE_FIREBASE_DATABASE_URL || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL : ''),
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : ''),
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : ''),
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : ''),
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : ''),
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID : '')
};

/**
 * Nothing here initializes on import.
 *
 * It used to. `initializeApp` ran at module scope, so *importing* this file was
 * enough to need credentials — and the Next.js static export imports it
 * transitively through Providers → AuthContext on every page. With no key in
 * the build environment, `next build` died on whichever page happened to
 * prerender first (`/de/contact`, though the page had nothing to do with it)
 * with `auth/invalid-api-key`.
 *
 * Making it lazy moves the credential requirement from build time to the moment
 * something actually talks to Firebase. Prerendering a static page never does,
 * so the export no longer needs production secrets — which also means CI, a
 * fresh clone and a fork can all build without them.
 *
 * The export surface is unchanged: `import { auth } from './firebase'` still
 * works everywhere, because each export is a Proxy that creates the real
 * service on first property access.
 */
let app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
    if (!app) app = initializeApp(firebaseConfig);
    return app;
}

/**
 * A stand-in that behaves like the service but builds it on first touch.
 *
 * `get` and `set` are enough for how these are used; `apply`/`construct` are not
 * forwarded because none of the exported services are called or constructed
 * directly.
 */
function lazyService<T extends object>(create: () => T): T {
    let instance: T | null = null;
    const resolve = (): T => (instance ??= create());

    return new Proxy({} as T, {
        get(_target, prop, receiver) {
            const value = Reflect.get(resolve() as object, prop, receiver);
            // Methods must keep their own `this`, or e.g. `auth.signOut()` loses
            // the instance it belongs to.
            return typeof value === 'function' ? value.bind(resolve()) : value;
        },
        set(_target, prop, value) {
            return Reflect.set(resolve() as object, prop, value);
        },
        has(_target, prop) {
            return Reflect.has(resolve() as object, prop);
        },
        getPrototypeOf() {
            return Reflect.getPrototypeOf(resolve() as object);
        },
    });
}

const auth = lazyService<Auth>(() => getAuth(getApp()));
const db = lazyService<Firestore>(() => getFirestore(getApp()));
const storage = lazyService<FirebaseStorage>(() => getStorage(getApp()));
// Region matches the Cloud Functions deployment.
const functions = lazyService<Functions>(() => getFunctions(getApp(), 'us-west1'));

/**
 * Analytics is a promise rather than a service, and it is resolved lazily too —
 * eagerly calling `isSupported()` would touch the app and defeat the point.
 *
 * Skipped entirely outside a browser, and inside a Chrome extension, where the
 * CSP, cookie and IndexedDB restrictions make it throw.
 */
let analyticsPromise: Promise<Analytics | null> | null = null;

const analytics: Promise<Analytics | null> = {
    then(onfulfilled, onrejected) {
        if (!analyticsPromise) {
            const isExtension = typeof window !== 'undefined'
                && (window.location.protocol === 'chrome-extension:'
                    || (typeof chrome !== 'undefined' && chrome.runtime && Boolean(chrome.runtime.id)));

            analyticsPromise = (!isExtension && typeof window !== 'undefined')
                ? isSupported().then(yes => (yes ? getAnalytics(getApp()) : null)).catch(() => null)
                : Promise.resolve(null);
        }
        return analyticsPromise.then(onfulfilled, onrejected);
    },
} as Promise<Analytics | null>;

/**
 * The provider is a plain value object with no app dependency, but it is still
 * created lazily so that merely importing this module allocates nothing.
 */
let provider: GoogleAuthProvider | null = null;
const googleProvider = lazyService<GoogleAuthProvider>(() => (provider ??= new GoogleAuthProvider()));

// Emulators, when VITE_USE_FIREBASE_EMULATOR=true.
// Usage: add it to .env.local, then restart the dev server.
//
// Browser-only: during a static export there is no emulator to connect to, and
// touching `db` here would undo the laziness above.
const useEmulator = import.meta.env?.VITE_USE_FIREBASE_EMULATOR
    || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR : 'false');

if (typeof window !== 'undefined' && useEmulator === 'true') {
    import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
        connectFirestoreEmulator(db, 'localhost', 8080);
    });
    import('firebase/functions').then(({ connectFunctionsEmulator }) => {
        connectFunctionsEmulator(functions, 'localhost', 5001);
    });
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('[Firebase] 🔧 Connected to local emulators (Firestore:8080, Functions:5001, Storage:9199)');
}

export { auth, db, storage, googleProvider, analytics, functions };
