// This file is a unified script that is compatible with GitHub Pages
// It assumes the Firebase libraries are loaded via script tags in the HTML.

document.addEventListener('DOMContentLoaded', function() {

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
    const shipsList = document.getElementById('ships-list');
    const planetsList = document.getElementById('planets-list');
    const addCruiserBtn = document.getElementById('add-cruiser-btn');
    const addHeavyCruiserBtn = document.getElementById('add-heavy-cruiser-btn');
    const addBattleshipBtn = document.getElementById('add-battleship-btn');
    const addBluePlanetBtn = document.getElementById('add-blue-planet-btn');
    const addRedPlanetBtn = document.getElementById('add-red-planet-btn');
    const addGoldPlanetBtn = document.getElementById('add-gold-planet-btn');

    let currentUserId = null;

    if (logoutBtn) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUserId = user.uid;
                setupRosterListener();
            } else {
                window.location.href = 'index.html';
            }
        });

        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Logout failed:", error);
            });
        });

        const addNewLocation = async (name, type) => {
            if (!currentUserId) return;
            try {
                await db.collection('rosters').doc(currentUserId).collection(type + 's').add({
                    name: name,
                    type: type,
                });
                console.log(`New ${type} added: ${name}.`);
            } catch (error) {
                console.error("Error adding location:", error);
            }
        };

        const deleteLocation = async (locationId, locationType) => {
            if (!currentUserId) return;
            try {
                // First, find and delete all units within the location
                const unitsSnapshot = await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).collection('units').get();
                const deletePromises = [];
                unitsSnapshot.forEach(unitDoc => {
                    deletePromises.push(unitDoc.ref.delete());
                });
                await Promise.all(deletePromises);
                
                // Then, delete the location document itself
                await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).delete();
                console.log("Location and its units deleted successfully.");
            } catch (error) {
                console.error("Error deleting location:", error);
            }
        };
        
        const renderLocationContainer = (doc, list) => {
            const location = doc.data();
            const li = document.createElement('li');
            li.className = 'locations-container';
            li.dataset.locationId = doc.id;
            li.dataset.locationType = location.type + 's';
            
            li.innerHTML = `
                <div class="location-header">
                    <input type="text" class="location-name-input" value="${location.name}">
                    <i class="fas fa-trash-alt delete-loc-btn"></i>
                </div>
                <h5>Units</h5>
                <ul class="roster-list unit-list"></ul>
                <div class="fallen-log">
                    <h5>The Fallen</h5>
                    <ul class="roster-list fallen-list"></ul>
                </div>
            `;
            list.appendChild(li);

            const nameInput = li.querySelector('.location-name-input');
            nameInput.addEventListener('change', async (e) => {
                await db.collection('rosters').doc(currentUserId).collection(location.type + 's').doc(doc.id).update({ name: e.target.value });
            });

            const deleteBtn = li.querySelector('.delete-loc-btn');
            deleteBtn.addEventListener('click', () => {
                deleteLocation(doc.id, location.type);
            });
            
            const unitList = li.querySelector('.unit-list');
            const fallenList = li.querySelector('.fallen-list');

            // Listen for units in this location
            db.collection('rosters').doc(currentUserId).collection(location.type + 's').doc(doc.id).collection('units').onSnapshot(snapshot => {
                unitList.innerHTML = '';
                snapshot.forEach(unitDoc => {
                    renderUnit(unitDoc, unitList);
                });
            });

            // Listen for fallen units
            db.collection('rosters').doc(currentUserId).collection('the_fallen').onSnapshot(snapshot => {
                fallenList.innerHTML = '';
                snapshot.forEach(fallenDoc => {
                    renderFallenUnit(fallenDoc, fallenList);
                });
            });
        };
        
        const renderUnit = (doc, parentList) => {
            const unit = doc.data();
            const li = document.createElement('li');
            li.className = 'unit-item';
            li.setAttribute('draggable', 'true');
            li.dataset.unitId = doc.id;
            li.dataset.locationId = doc.ref.parent.parent.id;
            li.dataset.locationType = doc.ref.parent.parent.path.split('/')[1];

            li.innerHTML = `
                <span>${unit.name}</span>
                <i class="fas fa-skull move-to-fallen-btn"></i>
            `;
            parentList.appendChild(li);
        };

        const renderFallenUnit = (doc, parentList) => {
            const unit = doc.data();
            const li = document.createElement('li');
            li.className = 'fallen-item';

            li.innerHTML = `
                <span>${unit.name}</span>
                <i class="fas fa-trash-alt delete-fallen-btn"></i>
            `;
            parentList.appendChild(li);
        };

        const setupRosterListener = () => {
            if (!currentUserId) return;
            
            db.collection('rosters').doc(currentUserId).collection('ships').onSnapshot(snapshot => {
                shipsList.innerHTML = '';
                snapshot.forEach(doc => renderLocationContainer(doc, shipsList));
            });
            db.collection('rosters').doc(currentUserId).collection('planets').onSnapshot(snapshot => {
                planetsList.innerHTML = '';
                snapshot.forEach(doc => renderLocationContainer(doc, planetsList));
            });
        };

        if (addCruiserBtn) addCruiserBtn.addEventListener('click', () => addNewLocation('Cruiser', 'ship'));
        if (addHeavyCruiserBtn) addHeavyCruiserBtn.addEventListener('click', () => addNewLocation('Heavy Cruiser', 'ship'));
        if (addBattleshipBtn) addBattleshipBtn.addEventListener('click', () => addNewLocation('Battleship', 'ship'));
        if (addBluePlanetBtn) addBluePlanetBtn.addEventListener('click', () => addNewLocation('Blue Planet', 'planet'));
        if (addRedPlanetBtn) addRedPlanetBtn.addEventListener('click', () => addNewLocation('Red Planet', 'planet'));
        if (addGoldPlanetBtn) addGoldPlanetBtn.addEventListener('click', () => addNewLocation('Gold Planet', 'planet'));

        let draggedUnit = null;

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('unit-item')) {
                draggedUnit = e.target;
                e.dataTransfer.setData('text/plain', draggedUnit.dataset.unitId);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        document.addEventListener('dragover', (e) => {
            const targetList = e.target.closest('.unit-list');
            if (targetList) {
                e.preventDefault();
                targetList.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const targetList = e.target.closest('.unit-list');
            if (targetList) {
                targetList.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.unit-list');
            
            if (dropTarget && draggedUnit) {
                const unitId = draggedUnit.dataset.unitId;
                const currentLocId = draggedUnit.dataset.locationId;
                const currentLocType = draggedUnit.dataset.locationType;
                
                const newLocationContainer = dropTarget.closest('.locations-container');
                const newLocationId = newLocationContainer ? newLocationContainer.dataset.locationId : null;
                const newLocationType = newLocationContainer ? newLocationContainer.dataset.locationType : null;
                
                if (newLocationId && newLocationId !== currentLocId) {
                    try {
                        const unitDoc = await db.collection('rosters').doc(currentUserId).collection(currentLocType).doc(currentLocId).collection('units').doc(unitId).get();
                        const unitData = unitDoc.data();
                        
                        await db.collection('rosters').doc(currentUserId).collection(newLocationType).doc(newLocationId).collection('units').add(unitData);
                        await db.collection('rosters').doc(currentUserId).collection(currentLocType).doc(currentLocId).collection('units').doc(unitId).delete();
                    } catch (error) {
                        console.error("Error moving unit:", error);
                    }
                }
                
                dropTarget.classList.remove('drag-over');
                draggedUnit = null;
            }
        });
    }
});
