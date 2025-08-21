// Import necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, addDoc, query, where, doc, getDoc } from "firebase/firestore";

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
const db = getFirestore(app);

// Get references to HTML elements
const logoutBtn = document.getElementById('logout-btn');
const addLocationForm = document.getElementById('add-location-form');
const locationNameInput = document.getElementById('location-name-input');
const locationTypeSelect = document.getElementById('location-type-select');
const planetsList = document.getElementById('planets-list');
const shipsList = document.getElementById('ships-list');

let currentUserId = null;

// --- Authentication and Redirection ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, get their UID
        currentUserId = user.uid;
        console.log("User is authenticated:", user.email, "UID:", currentUserId);
        
        // Start listening for roster data
        setupRosterListener();

    } else {
        // User is not signed in, redirect to login page
        console.log("No user is signed in. Redirecting to login page.");
        window.location.href = 'index.html';
    }
});

// Handle the logout process
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("User signed out successfully.");
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Logout failed:", error);
    });
});

// --- Firestore Database Logic ---

// Function to handle adding a new location (planet or ship)
addLocationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const locationName = locationNameInput.value.trim();
    const locationType = locationTypeSelect.value;
    
    if (locationName === '') return;

    // Use a try/catch block for error handling
    try {
        const userDocRef = doc(db, 'rosters', currentUserId);
        
        await addDoc(collection(userDocRef, locationType + 's'), {
            name: locationName,
            type: locationType,
            // You can add more properties here, like a list of units
            units: []
        });

        console.log(`New ${locationType} added successfully.`);
        locationNameInput.value = ''; // Clear the input field
    } catch (error) {
        console.error("Error adding location:", error);
    }
});

// Function to render the list of locations
const renderLocations = (doc) => {
    const location = doc.data();
    const li = document.createElement('li');
    li.innerHTML = `<h4>${location.name} (${location.type})</h4>`;
    
    if (location.type === 'planet') {
        planetsList.appendChild(li);
    } else if (location.type === 'ship') {
        shipsList.appendChild(li);
    }
};

// Real-time listener for the user's roster data
const setupRosterListener = () => {
    if (!currentUserId) return;

    const userDocRef = doc(db, 'rosters', currentUserId);

    // Create a listener for planets
    onSnapshot(collection(userDocRef, 'planets'), (snapshot) => {
        planetsList.innerHTML = ''; // Clear the list
        snapshot.forEach(doc => {
            renderLocations(doc);
        });
    });

    // Create a listener for ships
    onSnapshot(collection(userDocRef, 'ships'), (snapshot) => {
        shipsList.innerHTML = ''; // Clear the list
        snapshot.forEach(doc => {
            renderLocations(doc);
        });
    });
};
