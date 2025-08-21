// Import the necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCt_hsh6MCo_0sNWFKtAlsM-oSGVRGDPF8",
    authDomain: "conquest-command-deck.firebaseapp.com",
    projectId: "conquest-command-deck",
    storageBucket: "conquest-command-deck.firebasestorage.app",
    messagingSenderId: "993959061285",
    appId: "1:993959061285:web:438296814ad21edc0b1ccc",
    measurementId: "G-87NN5SXHXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get the logout button element
const logoutBtn = document.getElementById('logout-btn');

// Check the user's authentication status
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, so we can proceed
        console.log("User is authenticated:", user.email);
    } else {
        // User is not signed in, redirect to login page
        console.log("No user is signed in. Redirecting to login page.");
        window.location.href = 'index.html';
    }
});

// Handle the logout process
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sign-out successful
        console.log("User signed out successfully.");
        // Redirect to the login page
        window.location.href = 'index.html';
    }).catch((error) => {
        // An error happened
        console.error("Logout failed:", error);
        alert("Logout failed. Please try again.");
    });
});
