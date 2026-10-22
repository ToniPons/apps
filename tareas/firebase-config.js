/**
 * Config pública de Firebase (Spark / Firestore).
 * Completa estos valores desde Firebase Console → Project settings → Your apps → Web.
 * La apiKey web es pública a propósito; la seguridad va en firestore.rules.
 */
window.TAREAS_FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

window.TAREAS_FIREBASE_READY = Boolean(
  window.TAREAS_FIREBASE.apiKey &&
    window.TAREAS_FIREBASE.projectId &&
    window.TAREAS_FIREBASE.appId
);
