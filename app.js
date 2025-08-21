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
    const rosterGrid = document.querySelector('.roster-grid');
    const addCruiserBtn = document.getElementById('add-cruiser-btn');
    const addHeavyCruiserBtn = document.getElementById('add-heavy-cruiser-btn');
    const addBattleshipBtn = document.getElementById('add-battleship-btn');
    const addBluePlanetBtn = document.getElementById('add-blue-planet-btn');
    const addRedPlanetBtn = document.getElementById('add-red-planet-btn');
    const addGoldPlanetBtn = document.getElementById('add-gold-planet-btn');

    let currentUserId = null;
    let factionsData = {};

    if (logoutBtn) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUserId = user.uid;
                fetchFactionsData();
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

        const fetchFactionsData = async () => {
            try {
                const factionsSnapshot = await db.collection('gameData').collection('factions').get();
                factionsSnapshot.forEach(doc => {
                    factionsData[doc.id] = doc.data();
                });
                console.log("Factions data fetched successfully.");
            } catch (error) {
                console.error("Error fetching factions data:", error);
            }
        };

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
                await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).delete();
                console.log("Location deleted successfully.");
            } catch (error) {
                console.error("Error deleting location:", error);
            }
        };

        const moveToFallen = async (unitRef) => {
            const unitDoc = await unitRef.get();
            if (!unitDoc.exists) return;
            const unitData = unitDoc.data();
            
            const fallenCollection = db.collection('rosters').doc(currentUserId).collection('the_fallen');
            await fallenCollection.add(unitData);
            await unitRef.delete();
        };

        const deleteFallenUnit = async (unitId) => {
            try {
                await db.collection('rosters').doc(currentUserId).collection('the_fallen').doc(unitId).delete();
                console.log("Fallen unit deleted successfully.");
            } catch (error) {
                console.error("Error deleting fallen unit:", error);
            }
        };

        const renderLocations = (doc) => {
            const location = doc.data();
            const container = document.createElement('div');
            container.className = 'locations-container';
            container.dataset.locationId = doc.id;
            container.dataset.locationType = location.type + 's';
            
            container.innerHTML = `
                <div class="location-header">
                    <input type="text" class="location-name-input" value="${location.name}">
                    <i class="fas fa-trash-alt delete-loc-btn"></i>
                </div>
                <h5>Units</h5>
                <form class="add-unit-form">
                    <select class="detachment-select"></select>
                    <select class="unit-select" disabled></select>
                    <button type="submit">Add Unit</button>
                </form>
                <ul class="roster-list unit-list"></ul>
                <div class="fallen-log">
                    <h5>The Fallen</h5>
                    <ul class="roster-list fallen-list"></ul>
                </div>
            `;
            rosterGrid.appendChild(container);

            const nameInput = container.querySelector('.location-name-input');
            nameInput.addEventListener('change', async (e) => {
                await db.collection('rosters').doc(currentUserId).collection(location.type + 's').doc(doc.id).update({ name: e.target.value });
            });

            const deleteBtn = container.querySelector('.delete-loc-btn');
            deleteBtn.addEventListener('click', () => {
                deleteLocation(doc.id, location.type);
            });

            const detachmentSelect = container.querySelector('.detachment-select');
            const unitSelect = container.querySelector('.unit-select');
            
            db.collection('rosters').doc(currentUserId).collection('detachments').onSnapshot(snapshot => {
                detachmentSelect.innerHTML = '<option value="">-- Choose Detachment --</option>';
                snapshot.forEach(detachmentDoc => {
                    const option = document.createElement('option');
                    option.value = detachmentDoc.id;
                    option.textContent = detachmentDoc.data().name;
                    detachmentSelect.appendChild(option);
                });
            });

            detachmentSelect.addEventListener('change', async (e) => {
                const selectedDetachmentId = e.target.value;
                if (selectedDetachmentId) {
                    const detachmentDoc = await db.collection('rosters').doc(currentUserId).collection('detachments').doc(selectedDetachmentId).get();
                    const factionId = detachmentDoc.data().factionId;
                    if (factionId) {
                        const unitsSnapshot = await db.collection('gameData').collection('factions').doc(factionId).collection('units').get();
                        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                        unitsSnapshot.forEach(unitDoc => {
                            const option = document.createElement('option');
                            option.value = unitDoc.id;
                            option.textContent = unitDoc.data().name;
                            unitSelect.appendChild(option);
                        });
                        unitSelect.disabled = false;
                    }
                } else {
                    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                    unitSelect.disabled = true;
                }
            });

            const addUnitForm = container.querySelector('.add-unit-form');
            addUnitForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!unitSelect.value) return;
                await db.collection('rosters').doc(currentUserId).collection(location.type + 's').doc(doc.id).collection('units').add({
                    name: unitSelect.options[unitSelect.selectedIndex].text,
                    detachmentId: detachmentSelect.value
                });
            });
            
            const unitList = container.querySelector('.unit-list');
            const fallenList = container.querySelector('.fallen-list');

            db.collection('rosters').doc(currentUserId).collection(location.type + 's').doc(doc.id).collection('units').onSnapshot(snapshot => {
                unitList.innerHTML = '';
                snapshot.forEach(unitDoc => {
                    renderUnit(unitDoc, unitList);
                });
            });

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

            const moveToFallenBtn = li.querySelector('.move-to-fallen-btn');
            moveToFallenBtn.addEventListener('click', () => {
                moveToFallen(doc.ref);
            });
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

            const deleteFallenBtn = li.querySelector('.delete-fallen-btn');
            deleteFallenBtn.addEventListener('click', () => {
                deleteFallenUnit(doc.id);
            });
        };

        const setupRosterListener = () => {
            if (!currentUserId) return;
            rosterGrid.innerHTML = ''; // Clear the grid for re-rendering
            const planetsListener = db.collection('rosters').doc(currentUserId).collection('planets').onSnapshot((snapshot) => {
                snapshot.forEach(doc => renderLocations(doc));
            });
            const shipsListener = db.collection('rosters').doc(currentUserId).collection('ships').onSnapshot((snapshot) => {
                snapshot.forEach(doc => renderLocations(doc));
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
            if (targetList && !targetList.classList.contains('fallen-list')) {
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
                
                const newLocationId = dropTarget.dataset.locationId;
                const newLocationType = dropTarget.dataset.locationType;
                
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
