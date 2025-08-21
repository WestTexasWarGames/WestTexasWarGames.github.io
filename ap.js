// A single, unified JavaScript file to handle all functionality.
// This file assumes the Firebase libraries are loaded via script tags in the HTML.

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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Get references to HTML elements (Login Page)
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

if (loginBtn && signupBtn) {
    // Handle user login
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = 'command-deck.html';
            })
            .catch((error) => {
                alert("Login failed: " + error.message);
            });
    });

    // Handle user sign up
    signupBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                alert("Account created successfully! You can now log in.");
            })
            .catch((error) => {
                alert("Sign up failed: " + error.message);
            });
    });
}

// Get references to HTML elements (Command Deck)
const logoutBtn = document.getElementById('logout-btn');
const planetsList = document.getElementById('planets-list');
const shipsList = document.getElementById('ships-list');
const factionSelect = document.getElementById('faction-select');
const detachmentSelect = document.getElementById('detachment-select');
const selectedDetachmentUnitsList = document.getElementById('selected-detachment-units-list');
const addUnitToDetachmentForm = document.getElementById('add-unit-to-detachment-form');
const unitSelect = document.getElementById('unit-select');

const addCruiserBtn = document.getElementById('add-cruiser-btn');
const addHeavyCruiserBtn = document.getElementById('add-heavy-cruiser-btn');
const addBattleshipBtn = document.getElementById('add-battleship-btn');
const addBluePlanetBtn = document.getElementById('add-blue-planet-btn');
const addRedPlanetBtn = document.getElementById('add-red-planet-btn');
const addGoldPlanetBtn = document.getElementById('add-gold-planet-btn');

let currentUserId = null;

if (logoutBtn) {
    // --- Authentication and Redirection ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid;
            fetchFactionsAndPopulateSelect();
            setupRosterListener();
        } else {
            window.location.href = 'index.html';
        }
    });

    // Handle the logout process
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error("Logout failed:", error);
        });
    });

    // --- Firestore Database Logic ---
    const fetchFactionsAndPopulateSelect = async () => {
        try {
            const factionsSnapshot = await db.collection('gameData').doc('version_1').collection('factions').get();
            factionSelect.innerHTML = '<option value="">-- Choose a Faction --</option>';
            factionsSnapshot.forEach((doc) => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                factionSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching factions:", error);
        }
    };

    factionSelect.addEventListener('change', async () => {
        if (!currentUserId) return;
        const selectedFactionId = factionSelect.value;
        await db.collection('rosters').doc(currentUserId).set({ factionId: selectedFactionId }, { merge: true });
        
        if (selectedFactionId) {
            await fetchUnitsForFaction(selectedFactionId);
        } else {
            unitSelect.innerHTML = '<option value="">-- Select a Unit --</option>';
        }
    });

    detachmentSelect.addEventListener('change', async () => {
        const selectedDetachmentId = detachmentSelect.value;
        if (!selectedDetachmentId) {
            selectedDetachmentUnitsList.innerHTML = '';
            return;
        }
        selectedDetachmentUnitsList.dataset.locationId = selectedDetachmentId;
        db.collection('rosters').doc(currentUserId).collection('detachments').doc(selectedDetachmentId).collection('units')
            .onSnapshot((unitSnapshot) => {
                selectedDetachmentUnitsList.innerHTML = '';
                unitSnapshot.forEach(unitDoc => {
                    renderUnit(unitDoc, selectedDetachmentUnitsList);
                });
            });
    });

    addUnitToDetachmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedDetachmentId = detachmentSelect.value;
        const selectedUnitId = unitSelect.value;
        const unitName = unitSelect.options[unitSelect.selectedIndex].text;
    
        if (!selectedDetachmentId) {
            alert("Please select a detachment first.");
            return;
        }
        if (!selectedUnitId) {
            alert("Please select a unit to add.");
            return;
        }
        await db.collection('rosters').doc(currentUserId).collection('detachments').doc(selectedDetachmentId).collection('units').add({
            name: unitName,
            locationType: 'detachments',
            locationId: selectedDetachmentId
        });
        unitSelect.value = '';
    });

    const fetchUnitsForFaction = async (factionId) => {
        try {
            const unitsSnapshot = await db.collection('gameData').doc('version_1').collection('factions').doc(factionId).collection('units').get();
            unitSelect.innerHTML = '<option value="">-- Select a Unit --</option>';
            unitsSnapshot.forEach((doc) => {
                const unit = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = unit.name;
                unitSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching units:", error);
        }
    };

    const addNewLocation = async (name, type) => {
        if (!currentUserId) return;
        await db.collection('rosters').doc(currentUserId).collection(type + 's').add({
            name: name,
            type: type,
        });
    };

    addCruiserBtn.addEventListener('click', () => addNewLocation('Cruiser', 'ship'));
    addHeavyCruiserBtn.addEventListener('click', () => addNewLocation('Heavy Cruiser', 'ship'));
    addBattleshipBtn.addEventListener('click', () => addNewLocation('Battleship', 'ship'));
    addBluePlanetBtn.addEventListener('click', () => addNewLocation('Blue Planet', 'planet'));
    addRedPlanetBtn.addEventListener('click', () => addNewLocation('Red Planet', 'planet'));
    addGoldPlanetBtn.addEventListener('click', () => addNewLocation('Gold Planet', 'planet'));

    let draggedUnit = null;

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('unit-item')) {
            draggedUnit = e.target;
            e.dataTransfer.setData('text/plain', draggedUnit.dataset.unitId);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    document.addEventListener('dragover', (e) => {
        if (e.target.closest('.unit-list')) {
            e.preventDefault();
            const dropTarget = e.target.closest('.unit-list');
            dropTarget.classList.add('drag-over');
        }
    });

    document.addEventListener('dragleave', (e) => {
        const dropTarget = e.target.closest('.unit-list');
        if (dropTarget) {
            dropTarget.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', async (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.unit-list');
        
        if (dropTarget && draggedUnit) {
            const unitId = draggedUnit.dataset.unitId;
            const currentLocId = draggedUnit.dataset.locationId;
            const currentLocType = draggedUnit.dataset.locationType;
            
            const newLocationId = dropTarget.dataset.locationId;
            const newLocationType = dropTarget.dataset.locationType;
            
            if (newLocationId && newLocationId !== currentLocId) {
                try {
                    await db.collection('rosters').doc(currentUserId).collection(newLocationType).doc(newLocationId).collection('units').add({
                        name: draggedUnit.textContent,
                        locationType: newLocationType,
                        locationId: newLocationId
                    });
                    await db.collection('rosters').doc(currentUserId).collection(currentLocType).doc(currentLocId).collection('units').doc(unitId).delete();
                } catch (error) {
                    console.error("Error moving unit:", error);
                }
            }
            
            dropTarget.classList.remove('drag-over');
            draggedUnit = null;
        }
    });

    const renderLocations = (doc) => {
        const location = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `
            <h4>${location.name} (${location.type})</h4>
            <ul class="roster-list unit-list" data-location-id="${doc.id}" data-location-type="${location.type}s"></ul>
        `;
        if (location.type === 'planet') {
            planetsList.appendChild(li);
        } else if (location.type === 'ship') {
            shipsList.appendChild(li);
        }
        db.collection('rosters').doc(currentUserId).collection(`${location.type}s`).doc(doc.id).collection('units')
            .onSnapshot((unitSnapshot) => {
                const unitList = li.querySelector('.unit-list');
                unitList.innerHTML = '';
                unitSnapshot.forEach(unitDoc => {
                    renderUnit(unitDoc, unitList);
                });
            });
    };

    const renderUnit = (doc, parentList) => {
        const unit = doc.data();
        const li = document.createElement('li');
        li.className = 'unit-item';
        li.textContent = unit.name;
        li.setAttribute('draggable', 'true');
        li.dataset.unitId = doc.id;
        li.dataset.locationId = doc.ref.parent.parent.id;
        li.dataset.locationType = doc.ref.parent.parent.path.split('/')[1];
        
        if (parentList.id === 'selected-detachment-units-list') {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'x';
            deleteButton.className = 'delete-unit-btn';
            deleteButton.addEventListener('click', async () => {
                const unitRef = db.collection('rosters').doc(currentUserId).collection('detachments').doc(parentList.dataset.locationId).collection('units').doc(doc.id);
                await unitRef.delete();
            });
            li.appendChild(deleteButton);
        }
        parentList.appendChild(li);
    };

    const setupRosterListener = () => {
        if (!currentUserId) return;
        db.collection('rosters').doc(currentUserId).collection('detachments')
            .onSnapshot((snapshot) => {
                detachmentSelect.innerHTML = '<option value="">-- Choose a Detachment --</option>';
                snapshot.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().name;
                    detachmentSelect.appendChild(option);
                });
                selectedDetachmentUnitsList.dataset.locationId = 'detachments';
            });
        
        db.collection('rosters').doc(currentUserId).collection('planets')
            .onSnapshot((snapshot) => {
                planetsList.innerHTML = '';
                snapshot.forEach(doc => {
                    renderLocations(doc);
                });
            });

        db.collection('rosters').doc(currentUserId).collection('ships')
            .onSnapshot((snapshot) => {
                shipsList.innerHTML = '';
                snapshot.forEach(doc => {
                    renderLocations(doc);
                });
            });
    };
}
