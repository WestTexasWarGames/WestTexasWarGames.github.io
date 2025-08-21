// Import necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    getDocs,
    setDoc,
    query
} from "firebase/firestore";

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

const factionSelect = document.getElementById('faction-select');
const addDetachmentForm = document.getElementById('add-detachment-form');
const detachmentNameInput = document.getElementById('detachment-name-input');
const detachmentsList = document.getElementById('detachments-list');

let currentUserId = null;

// --- Authentication and Redirection ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, get their UID
        currentUserId = user.uid;
        console.log("User is authenticated:", user.email, "UID:", currentUserId);
        
        // Fetch and populate the list of factions
        fetchFactionsAndPopulateSelect();
        
        // Start listening for the user's roster data
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

// Function to fetch factions from the database and populate the dropdown
const fetchFactionsAndPopulateSelect = async () => {
    try {
        const factionsSnapshot = await getDocs(collection(db, 'gameData', 'factions'));
        factionsSnapshot.forEach((doc) => {
            const faction = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = faction.name;
            factionSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching factions:", error);
    }
};

// Function to handle faction selection
factionSelect.addEventListener('change', async () => {
    if (!currentUserId) return;
    const selectedFactionId = factionSelect.value;
    const userDocRef = doc(db, 'rosters', currentUserId);

    try {
        // Update the user's roster with the selected faction
        await setDoc(userDocRef, { factionId: selectedFactionId }, { merge: true });
        console.log("User faction updated to:", selectedFactionId);
    } catch (error) {
        console.error("Error updating user faction:", error);
    }
});

// Function to handle adding a new detachment
addDetachmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) return;
    
    const detachmentName = detachmentNameInput.value.trim();
    const selectedFactionId = factionSelect.value;
    
    if (detachmentName === '' || selectedFactionId === '') {
        alert("Please select a faction and enter a detachment name.");
        return;
    }

    try {
        const userDocRef = doc(db, 'rosters', currentUserId);
        
        await addDoc(collection(userDocRef, 'detachments'), {
            name: detachmentName,
            factionId: selectedFactionId, // Link the detachment to the selected faction
            units: [] // Start with an empty list of units
        });

        console.log(`New detachment added successfully.`);
        detachmentNameInput.value = ''; // Clear the input field
    } catch (error) {
        console.error("Error adding detachment:", error);
    }
});

// Function to render the list of detachments
const renderDetachments = (doc) => {
    const detachment = doc.data();
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="detachment-item">
            <h4>${detachment.name}</h4>
        </div>
    `;
    detachmentsList.appendChild(li);
};

// Function to handle adding a new location (planet or ship)
addLocationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const locationName = locationNameInput.value.trim();
    const locationType = locationTypeSelect.value;
    
    if (locationName === '') return;

    try {
        const userDocRef = doc(db, 'rosters', currentUserId);
        
        await addDoc(collection(userDocRef, locationType + 's'), {
            name: locationName,
            type: locationType,
            units: []
        });

        console.log(`New ${locationType} added successfully.`);
        locationNameInput.value = '';
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

    // Create a listener for detachments
    onSnapshot(collection(userDocRef, 'detachments'), (snapshot) => {
        detachmentsList.innerHTML = ''; // Clear the list
        snapshot.forEach(doc => {
            renderDetachments(doc);
        });
    });

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
