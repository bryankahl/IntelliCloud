import { isFirebaseConfigured, firebaseEnv } from './config';

// Top-level imports only:
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

let register, login, logout, getCurrentUser, onAuthStateChangedSub, isMockAuth;

if (isFirebaseConfigured) {
  // --- Real Firebase Auth ---
  const app = initializeApp({
    apiKey: firebaseEnv.apiKey,
    authDomain: firebaseEnv.authDomain,
    projectId: firebaseEnv.projectId,
    appId: firebaseEnv.appId,
  });

  const auth = getAuth(app);

  register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password).then((r) => r.user);

  login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password).then((r) => r.user);

  logout = () => signOut(auth);

  getCurrentUser = () => auth.currentUser;

  onAuthStateChangedSub = (cb) => onAuthStateChanged(auth, cb);

  isMockAuth = false;
} else {
  // --- Mock Auth (LocalStorage) for Phase 1 ---
  const KEY = 'ic_mock_user';

  const safeGet = () => {
    try {
      return typeof localStorage !== 'undefined'
        ? JSON.parse(localStorage.getItem(KEY) || 'null')
        : null;
    } catch {
      return null;
    }
  };
  const safeSet = (user) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY, JSON.stringify(user));
        // Fire a same-tab microtask callback for listeners
        if (typeof window !== 'undefined') {
          Promise.resolve().then(() =>
            window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
          );
        }
      }
    } catch { /* ignore */ }
  };
  const safeRemove = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(KEY);
        if (typeof window !== 'undefined') {
          Promise.resolve().then(() =>
            window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
          );
        }
      }
    } catch { /* ignore */ }
  };

  register = async (email, _password) => {              // underscore = intentionally unused
    void _password;
    const user = { uid: 'mock-' + Math.random().toString(36).slice(2), email };
    safeSet(user);
    await new Promise((r) => setTimeout(r, 250));
    return user;
  };

  login = async (email, _password) => {                 // underscore here too
    void _password;
    let user = safeGet();
    if (!user) {
      user = { uid: 'mock-' + Math.random().toString(36).slice(2), email };
      safeSet(user);
    }
    await new Promise((r) => setTimeout(r, 200));
    return user;
  };

  logout = async () => {
    safeRemove();
    await new Promise((r) => setTimeout(r, 120));
  };

  getCurrentUser = () => safeGet();

  onAuthStateChangedSub = (cb) => {
    const listener = () => cb(getCurrentUser());
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', listener);
      // Initial tick so subscribers get the current user immediately
      Promise.resolve().then(listener);
      return () => window.removeEventListener('storage', listener);
    }
    // SSR/no-window fallback: call once and return a no-op unsubscribe
    listener();
    return () => {};
  };

  isMockAuth = true;
}

export { register, login, logout, getCurrentUser, onAuthStateChangedSub, isMockAuth };
