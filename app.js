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
            auth.createUserWithAndPassword(email, password)
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
    const locationDetails = document.getElementById('location-details');
    const addCruiserBtn = document.getElementById('add-cruiser-btn');
    const addHeavyCruiserBtn = document.getElementById('add-heavy-cruiser-btn');
    const addBattleshipBtn = document.getElementById('add-battleship-btn');
    const addBluePlanetBtn = document.getElementById('add-blue-planet-btn');
    const addRedPlanetBtn = document.getElementById('add-red-planet-btn');
    const addGoldPlanetBtn = document.getElementById('add-gold-planet-btn');

    let currentUserId = null;
    let factionsData = {};
    const GAME_DATA_DOC_ID = 'conquest'; 

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
                // Correct database path for factions
                const factionsSnapshot = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').get();
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
                const unitsSnapshot = await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).collection('units').get();
                const deletePromises = [];
                unitsSnapshot.forEach(unitDoc => {
                    deletePromises.push(unitDoc.ref.delete());
                });
                await Promise.all(deletePromises);
                
                await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).delete();
                locationDetails.innerHTML = `<p class="placeholder-text">Select a ship or planet to view its details.</p>`;
                console.log("Location and its units deleted successfully.");
            } catch (error) {
                console.error("Error deleting location:", error);
            }
        };

        const moveToFallen = async (unitRef, locationId, locationType) => {
            const unitDoc = await unitRef.get();
            if (!unitDoc.exists) return;
            const unitData = unitDoc.data();
            
            const fallenCollection = db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).collection('the_fallen');
            await fallenCollection.add(unitData);
            await unitRef.delete();
        };

        const deleteFallenUnit = async (fallenRef) => {
            try {
                await fallenRef.delete();
                console.log("Fallen unit deleted successfully.");
            } catch (error) {
                console.error("Error deleting fallen unit:", error);
            }
        };

        const renderLocationTabs = (doc, list) => {
            const location = doc.data();
            const li = document.createElement('li');
            li.className = 'locations-container';
            li.dataset.locationId = doc.id;
            li.dataset.locationType = location.type + 's';
            li.textContent = location.name;
            list.appendChild(li);

            li.addEventListener('click', () => {
                document.querySelectorAll('.locations-container').forEach(tab => {
                    tab.classList.remove('active');
                });
                li.classList.add('active');
                renderLocationDetails(doc);
            });
        };

        const renderLocationDetails = (doc) => {
            const location = doc.data();
            const locationId = doc.id;
            const locationType = location.type + 's';

            locationDetails.innerHTML = `
                <div class="location-header">
                    <input type="text" class="location-name-input" value="${location.name}">
                    <i class="fas fa-trash-alt delete-loc-btn"></i>
                </div>
                <h5>Units</h5>
                <form class="add-unit-form">
                    <select class="faction-select"></select>
                    <select class="detachment-select" disabled></select>
                    <select class="unit-select" disabled></select>
                    <button type="submit">Add Unit</button>
                </form>
                <ul class="roster-list unit-list" data-location-id="${locationId}" data-location-type="${locationType}"></ul>
                <div class="fallen-log">
                    <h5>The Fallen</h5>
                    <ul class="roster-list fallen-list"></ul>
                </div>
            `;

            const nameInput = locationDetails.querySelector('.location-name-input');
            nameInput.addEventListener('change', async (e) => {
                await db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).update({ name: e.target.value });
            });

            const deleteBtn = locationDetails.querySelector('.delete-loc-btn');
            deleteBtn.addEventListener('click', () => {
                deleteLocation(locationId, location.type);
            });
            
            const factionSelect = locationDetails.querySelector('.faction-select');
            const detachmentSelect = locationDetails.querySelector('.detachment-select');
            const unitSelect = locationDetails.querySelector('.unit-select');
            const addUnitForm = locationDetails.querySelector('.add-unit-form');
            const unitList = locationDetails.querySelector('.unit-list');
            const fallenList = locationDetails.querySelector('.fallen-list');

            for (const factionId in factionsData) {
                const option = document.createElement('option');
                option.value = factionId;
                option.textContent = factionsData[factionId].name;
                factionSelect.appendChild(option);
            }

            factionSelect.addEventListener('change', async (e) => {
                const selectedFactionId = e.target.value;
                if (!selectedFactionId) {
                    detachmentSelect.disabled = true;
                    detachmentSelect.innerHTML = '<option value="">-- Choose Detachment --</option>';
                    unitSelect.disabled = true;
                    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                    return;
                }
                
                // Add a log to confirm the query path
                console.log(`Fetching detachments from path: gameData/${GAME_DATA_DOC_ID}/factions/${selectedFactionId}/detachments`);
                const detachmentsSnapshot = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').doc(selectedFactionId).collection('detachments').get();
                
                // Add a log to check the number of documents returned
                console.log(`Found ${detachmentsSnapshot.size} detachments.`);
                
                detachmentSelect.innerHTML = '<option value="">-- Choose Detachment --</option>';
                detachmentsSnapshot.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().name;
                    detachmentSelect.appendChild(option);
                });
                detachmentSelect.disabled = false;
            });

            detachmentSelect.addEventListener('change', async (e) => {
                const selectedDetachmentId = e.target.value;
                if (!selectedDetachmentId) {
                    unitSelect.disabled = true;
                    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                    return;
                }
                const detachmentDoc = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').doc(factionSelect.value).collection('detachments').doc(selectedDetachmentId).get();
                const factionId = detachmentDoc.data().factionId;
                const unitsSnapshot = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').doc(factionId).collection('units').get();
                unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                unitsSnapshot.forEach(unitDoc => {
                    const option = document.createElement('option');
                    option.value = unitDoc.id;
                    option.textContent = unitDoc.data().name;
                    unitSelect.appendChild(option);
                });
                unitSelect.disabled = false;
            });

            addUnitForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!unitSelect.value) return;
                await db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('units').add({
                    name: unitSelect.options[unitSelect.selectedIndex].text,
                    detachmentId: detachmentSelect.value,
                });
            });

            db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('units').onSnapshot(snapshot => {
                unitList.innerHTML = '';
                snapshot.forEach(unitDoc => {
                    renderUnit(unitDoc, unitList, locationType, locationId);
                });
            });

            db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('the_fallen').onSnapshot(snapshot => {
                fallenList.innerHTML = '';
                snapshot.forEach(fallenDoc => {
                    renderFallenUnit(fallenDoc, fallenList, locationType, locationId);
                });
            });
        };
        
        const renderUnit = (doc, parentList, locationType, locationId) => {
            const unit = doc.data();
            const li = document.createElement('li');
            li.className = 'unit-item';
            li.setAttribute('draggable', 'true');
            li.dataset.unitId = doc.id;
            li.dataset.locationId = locationId;
            li.dataset.locationType = locationType;

            li.innerHTML = `
                <span>${unit.name}</span>
                <i class="fas fa-skull move-to-fallen-btn"></i>
            `;
            parentList.appendChild(li);

            const moveToFallenBtn = li.querySelector('.move-to-fallen-btn');
            moveToFallenBtn.addEventListener('click', () => {
                const unitRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('units').doc(doc.id);
                moveToFallen(unitRef, locationId, locationType);
            });
        };

        const renderFallenUnit = (doc, parentList, locationType, locationId) => {
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
                const fallenRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('the_fallen').doc(doc.id);
                deleteFallenUnit(fallenRef);
            });
        };

        const setupRosterListener = () => {
            if (!currentUserId) return;
            
            db.collection('rosters').doc(currentUserId).collection('ships').onSnapshot(snapshot => {
                shipsList.innerHTML = '';
                snapshot.forEach(doc => renderLocationTabs(doc, shipsList));
            });
            db.collection('rosters').doc(currentUserId).collection('planets').onSnapshot(snapshot => {
                planetsList.innerHTML = '';
                snapshot.forEach(doc => renderLocationTabs(doc, planetsList));
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
            const targetList = e.target.closest('.unit-list');
            if (targetList && !targetList.closest('.fallen-log')) {
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
                
                const newLocationContainer = dropTarget.closest('.content-area');
                const newLocationId = newLocationContainer ? newLocationContainer.querySelector('.unit-list').dataset.locationId : null;
                const newLocationType = newLocationContainer ? newLocationContainer.querySelector('.unit-list').dataset.locationType : null;
                
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
