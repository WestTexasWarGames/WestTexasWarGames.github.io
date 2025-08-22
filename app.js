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
        loginBtn.addEventListener('click', function() {
            const email = emailInput.value;
            const password = passwordInput.value;
            auth.signInWithEmailAndPassword(email, password)
                .then(function() {
                    window.location.href = 'command-deck.html';
                })
                .catch(function(error) {
                    alert("Login failed: " + error.message);
                });
        });

        // Handle user sign up
        signupBtn.addEventListener('click', function() {
            const email = emailInput.value;
            const password = passwordInput.value;
            auth.createUserWithEmailAndPassword(email, password)
                .then(function() {
                    alert("Account created successfully! You can now log in.");
                })
                .catch(function(error) {
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
    const factionSelect = document.getElementById('faction-select');
    const unitSelect = document.getElementById('unit-select');
    const addUnitForm = document.getElementById('add-unit-form');
    const pointsDisplay = document.getElementById('points-display');

    let currentUserId = null;
    let factionsData = {};
    const GAME_DATA_DOC_ID = 'conquest'; 

    if (logoutBtn) {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                currentUserId = user.uid;
                fetchFactionsData();
                setupRosterListener();
                setupDropdownListeners();
            } else {
                window.location.href = 'index.html';
            }
        });

        logoutBtn.addEventListener('click', function() {
            auth.signOut().then(function() {
                window.location.href = 'index.html';
            }).catch(function(error) {
                console.error("Logout failed:", error);
            });
        });
        
        const fetchFactionsData = async function() {
            try {
                const factionsSnapshot = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').get();
                
                factionSelect.innerHTML = '<option value="">-- Choose a Faction --</option>';

                factionsSnapshot.forEach(function(doc) {
                    factionsData[doc.id] = doc.data();
                    
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().name;
                    factionSelect.appendChild(option);
                });
                console.log("Factions data fetched and dropdown populated.");
            } catch (error) {
                console.error("Error fetching factions data:", error);
            }
        };

        const addNewLocation = async function(name, type) {
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

        const deleteLocation = async function(locationId, locationType) {
            if (!currentUserId) return;
            try {
                const unitsSnapshot = await db.collection('rosters').doc(currentUserId).collection(locationType + 's').doc(locationId).collection('units').get();
                const deletePromises = [];
                unitsSnapshot.forEach(function(unitDoc) {
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

        const moveToFallen = async function(unitRef, locationId, locationType, unitPoints) {
            const unitDoc = await unitRef.get();
            if (!unitDoc.exists) return;
            const unitData = unitDoc.data();
            
            const fallenCollection = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('the_fallen');
            await fallenCollection.add(unitData);
            await unitRef.delete();
            const locationRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId);
            const locationDoc = await locationRef.get();
            const currentPoints = locationDoc.data().points || 0;
            const newPoints = Math.max(0, currentPoints - unitPoints);
            await locationRef.update({ points: newPoints });
        };

        const deleteFallenUnit = async function(fallenRef) {
            try {
                await fallenRef.delete();
                console.log("Fallen unit deleted successfully.");
            } catch (error) {
                console.error("Error deleting fallen unit:", error);
            }
        };

        const renderLocationTabs = function(doc, list) {
            const location = doc.data();
            const li = document.createElement('li');
            li.className = 'locations-container';
            li.dataset.locationId = doc.id;
            li.dataset.locationType = location.type + 's';
            li.textContent = `${location.name} (${location.points || 0} pts)`;
            list.appendChild(li);

            li.addEventListener('click', function() {
                document.querySelectorAll('.locations-container').forEach(function(tab) {
                    tab.classList.remove('active');
                });
                li.classList.add('active');
                renderLocationDetails(doc);
            });
        };

        const renderLocationDetails = function(doc) {
            const location = doc.data();
            const locationId = doc.id;
            const locationType = location.type + 's';

            locationDetails.innerHTML = `
                <div class="location-header">
                    <input type="text" class="location-name-input" value="${location.name}">
                    <i class="fas fa-trash-alt delete-loc-btn"></i>
                </div>
                <input type="text" class="location-notes-input" placeholder="Enter Detachment">
                <div class="points-display">
                    Current Points: <span id="current-points">${location.points || 0}</span> pts
                </div>
                <h5>Units</h5>
                <ul class="roster-list unit-list" data-location-id="${locationId}" data-location-type="${locationType}"></ul>
                <div class="fallen-log">
                    <h5>The Fallen</h5>
                    <ul class="roster-list fallen-list"></ul>
                </div>
            `;

            const nameInput = locationDetails.querySelector('.location-name-input');
            nameInput.addEventListener('change', async function(e) {
                await db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).update({ name: e.target.value });
            });

            const notesInput = locationDetails.querySelector('.location-notes-input');
            if (location.notes) {
                notesInput.value = location.notes;
            }
            notesInput.addEventListener('change', async function(e) {
                await db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).update({ notes: e.target.value });
            });

            const deleteBtn = locationDetails.querySelector('.delete-loc-btn');
            deleteBtn.addEventListener('click', function() {
                deleteLocation(locationId, location.type);
            });
            
            const unitList = locationDetails.querySelector('.unit-list');
            const fallenList = locationDetails.querySelector('.fallen-list');

            db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('units').onSnapshot(function(snapshot) {
                unitList.innerHTML = '';
                let totalPoints = 0;
                snapshot.forEach(function(unitDoc) {
                    const unitData = unitDoc.data();
                    renderUnit(unitDoc, unitList, locationType, locationId);
                    totalPoints += parseInt(unitData.points || 0);
                });
                const pointsSpan = document.getElementById('current-points');
                if (pointsSpan) {
                    pointsSpan.textContent = totalPoints;
                }
                db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).update({ points: totalPoints });
            });

            db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('the_fallen').onSnapshot(function(snapshot) {
                fallenList.innerHTML = '';
                snapshot.forEach(function(fallenDoc) {
                    renderFallenUnit(fallenDoc, fallenList, locationType, locationId);
                });
            });
        };
        
        const setupDropdownListeners = function() {
            if (factionSelect) {
                factionSelect.addEventListener('change', async function(e) {
                    const selectedFactionId = e.target.value;
                    if (!selectedFactionId) {
                        unitSelect.disabled = true;
                        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                        return;
                    }
                    const unitsSnapshot = await db.collection('gameData').doc(GAME_DATA_DOC_ID).collection('factions').doc(selectedFactionId).collection('units').get();
                    
                    const units = [];
                    unitsSnapshot.forEach(function(unitDoc) {
                        units.push({ id: unitDoc.id, data: unitDoc.data() });
                    });

                    units.sort((a, b) => a.data.name.localeCompare(b.data.name));

                    unitSelect.innerHTML = '<option value="">-- Select a Unit --</option>';
                    units.forEach(function(unit) {
                        const option = document.createElement('option');
                        option.value = unit.id;
                        option.textContent = `${unit.data.name} (${unit.data.points} pts)`;
                        option.dataset.points = unit.data.points;
                        unitSelect.appendChild(option);
                    });
                    
                    unitSelect.disabled = false;
                });
            }

            if (addUnitForm) {
                addUnitForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const activeTab = document.querySelector('.locations-container.active');
                    if (!activeTab) {
                        alert('Please select a ship or planet first.');
                        return;
                    }
                    const locationId = activeTab.dataset.locationId;
                    const locationType = activeTab.dataset.locationType;
                    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
                    const unitName = selectedOption.textContent;
                    const unitPoints = selectedOption.dataset.points;
                    const unitId = unitSelect.value;
                    
                    if (!unitId) {
                        alert('Please select a unit to add.');
                        return;
                    }
                    
                    const locationRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId);

                    await locationRef.collection('units').add({
                        name: unitName,
                        points: unitPoints
                    });
                });
            }
        };

        const renderUnit = function(doc, parentList, locationType, locationId) {
            const unit = doc.data();
            const li = document.createElement('li');
            li.className = 'unit-item';
            li.setAttribute('draggable', 'true');
            li.dataset.unitId = doc.id;
            li.dataset.locationId = locationId;
            li.dataset.locationType = locationType;
            li.dataset.unitPoints = unit.points;
            
            li.innerHTML = `
                <span>${unit.name} (${unit.points} pts)</span>
                <i class="fas fa-skull move-to-fallen-btn"></i>
            `;
            parentList.appendChild(li);

            const moveToFallenBtn = li.querySelector('.move-to-fallen-btn');
            moveToFallenBtn.addEventListener('click', function() {
                const unitRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('units').doc(doc.id);
                moveToFallen(unitRef, locationId, locationType, unit.points);
            });
        };

        const renderFallenUnit = function(doc, parentList, locationType, locationId) {
            const unit = doc.data();
            const li = document.createElement('li');
            li.className = 'fallen-item';

            li.innerHTML = `
                <span>${unit.name}</span>
                <i class="fas fa-trash-alt delete-fallen-btn"></i>
            `;
            parentList.appendChild(li);

            const deleteFallenBtn = li.querySelector('.delete-fallen-btn');
            deleteFallenBtn.addEventListener('click', function() {
                const fallenRef = db.collection('rosters').doc(currentUserId).collection(locationType).doc(locationId).collection('the_fallen').doc(doc.id);
                deleteFallenUnit(fallenRef);
            });
        };

        const setupRosterListener = function() {
            if (!currentUserId) return;
            
            db.collection('rosters').doc(currentUserId).collection('ships').onSnapshot(function(snapshot) {
                const activeTab = shipsList.querySelector('.locations-container.active');
                const activeLocationId = activeTab ? activeTab.dataset.locationId : null;

                shipsList.innerHTML = '';
                snapshot.forEach(function(doc) {
                    renderLocationTabs(doc, shipsList);
                });

                if (activeLocationId) {
                    const newActiveTab = shipsList.querySelector(`.locations-container[data-location-id="${activeLocationId}"]`);
                    if (newActiveTab) {
                        newActiveTab.classList.add('active');
                    }
                }
            });
            db.collection('rosters').doc(currentUserId).collection('planets').onSnapshot(function(snapshot) {
                const activeTab = planetsList.querySelector('.locations-container.active');
                const activeLocationId = activeTab ? activeTab.dataset.locationId : null;

                planetsList.innerHTML = '';
                snapshot.forEach(function(doc) {
                    renderLocationTabs(doc, planetsList);
                });

                if (activeLocationId) {
                    const newActiveTab = planetsList.querySelector(`.locations-container[data-location-id="${activeLocationId}"]`);
                    if (newActiveTab) {
                        newActiveTab.classList.add('active');
                    }
                }
            });
        };

        addCruiserBtn.addEventListener('click', function() { addNewLocation('Cruiser', 'ship'); });
        addHeavyCruiserBtn.addEventListener('click', function() { addNewLocation('Heavy Cruiser', 'ship'); });
        addBattleshipBtn.addEventListener('click', function() { addNewLocation('Battleship', 'ship'); });
        addBluePlanetBtn.addEventListener('click', function() { addNewLocation('Blue Planet', 'planet'); });
        addRedPlanetBtn.addEventListener('click', function() { addNewLocation('Red Planet', 'planet'); });
        addGoldPlanetBtn.addEventListener('click', function() { addNewLocation('Gold Planet', 'planet'); });

        let draggedUnit = null;

        document.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('unit-item')) {
                draggedUnit = e.target;
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    unitId: draggedUnit.dataset.unitId,
                    unitPoints: draggedUnit.dataset.unitPoints
                }));
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        document.addEventListener('dragover', function(e) {
            const targetList = e.target.closest('.unit-list');
            if (targetList && !targetList.closest('.fallen-log')) {
                e.preventDefault();
                targetList.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', function(e) {
            const targetList = e.target.closest('.unit-list');
            if (targetList) {
                targetList.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', async function(e) {
            e.preventDefault();
            const dropTarget = e.target.closest('.unit-list');
            
            if (dropTarget && draggedUnit) {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const unitId = data.unitId;
                const currentLocId = draggedUnit.dataset.locationId;
                const currentLocType = draggedUnit.dataset.locationType;
                
                const newLocationId = dropTarget.dataset.locationId;
                const newLocationType = dropTarget.dataset.locationType;
                
                if (newLocationId && newLocationId !== currentLocId) {
                    try {
                        const newLocationRef = db.collection('rosters').doc(currentUserId).collection(newLocationType).doc(newLocationId);
                        
                        const unitDoc = await db.collection('rosters').doc(currentUserId).collection(currentLocType).doc(currentLocId).collection('units').doc(unitId).get();
                        const unitData = unitDoc.data();
                        
                        await newLocationRef.collection('units').add(unitData);
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
