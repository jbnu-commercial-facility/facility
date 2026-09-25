import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaj1Y_jzDaixJI_76wcWzNv9Q3SRClsTc",
  authDomain: "jbnu-commercial-facility.firebaseapp.com",
  projectId: "jbnu-commercial-facility",
  storageBucket: "jbnu-commercial-facility.firebasestorage.app",
  messagingSenderId: "511345137710",
  appId: "1:511345137710:web:e592cf016e1c6533aa67bf",
  measurementId: "G-00CD55F3YL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);