// firebase-config.js

// Configuração do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDgmiMtSEPcTqdfDgLOL3pzCeOL6CGaHvk",
  authDomain: "sistemafinanceiro-c5f6b.firebaseapp.com",
  projectId: "sistemafinanceiro-c5f6b",
  storageBucket: "sistemafinanceiro-c5f6b.firebasestorage.app",
  messagingSenderId: "511053597442",
  appId: "1:511053597442:web:386d029a5432379813d01b"
};

// Inicializa usando COMPAT
firebase.initializeApp(firebaseConfig);

// Serviços compatíveis
const auth = firebase.auth();
const db = firebase.firestore();
