const firebase = require("firebase/compat/app");
require("firebase/compat/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCuLJZlVYLWbqvB3PBZ6uKVzcaaTrP6-aU",
  authDomain: "ishtop-671ef.firebaseapp.com",
  projectId: "ishtop-671ef",
  storageBucket: "ishtop-671ef.firebasestorage.app",
  messagingSenderId: "908458500178",
  appId: "1:908458500178:web:97a415f91ea4f59e09bf8b"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

module.exports = { db };