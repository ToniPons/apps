/**
 * Config pública de Firebase (Spark / Firestore).
 * La apiKey web es pública a propósito; la seguridad va en firestore.rules.
 */
window.TAREAS_FIREBASE = {
  apiKey: "AIzaSyC0diYdLYYwtHsGIe1orJD4FpoLnMNp9Pw",
  authDomain: "listtareas-47977.firebaseapp.com",
  projectId: "listtareas-47977",
  storageBucket: "listtareas-47977.firebasestorage.app",
  messagingSenderId: "479733666652",
  appId: "1:479733666652:web:a8577e6be70a73a128a799",
};

window.TAREAS_FIREBASE_READY = Boolean(
  window.TAREAS_FIREBASE.apiKey &&
    window.TAREAS_FIREBASE.projectId &&
    window.TAREAS_FIREBASE.appId
);
