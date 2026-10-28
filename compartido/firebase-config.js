/**
 * Mismo proyecto Firebase que Tareas (Spark).
 * Colección distinta: homes/… (gastos compartidos).
 */
window.COMPARTIDO_FIREBASE = {
  apiKey: "AIzaSyC0diYdLYYwtHsGIe1orJD4FpoLnMNp9Pw",
  authDomain: "listtareas-47977.firebaseapp.com",
  projectId: "listtareas-47977",
  storageBucket: "listtareas-47977.firebasestorage.app",
  messagingSenderId: "479733666652",
  appId: "1:479733666652:web:a8577e6be70a73a128a799",
};

window.COMPARTIDO_FIREBASE_READY = Boolean(
  window.COMPARTIDO_FIREBASE.apiKey &&
    window.COMPARTIDO_FIREBASE.projectId &&
    window.COMPARTIDO_FIREBASE.appId
);
