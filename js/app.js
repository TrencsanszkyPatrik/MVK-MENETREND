// A fájl tartalma törölve 

// Globális változók
let routes = [];
let stops = [];
let stopTimes = [];
let trips = [];
let favorites = {
    stops: [],
    routes: []
};
let selectedStop = null;
let isShowingNearbyStops = false;

// DOM elemek
const dateSelect = document.getElementById('dateSelect');
const routeSelect = document.getElementById('routeSelect');
const directionSelect = document.getElementById('directionSelect');
const stopSelect = document.getElementById('stopSelect');
const scheduleResults = document.getElementById('scheduleResults');
const stopsPage = document.getElementById('stopsPage');
const stopsDateSelect = document.getElementById('stopsDateSelect');
const stopSearch = document.getElementById('stopFilter');
const stopsList = document.getElementById('stopsList');
const stopsScheduleTitle = document.getElementById('stopsScheduleTitle');
const stopsScheduleResults = document.getElementById('stopsScheduleResults');

// CSV fájl feldolgozása
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const obj = {};
        const currentLine = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentLine[j] ? currentLine[j].trim() : '';
        }
        result.push(obj);
    }

    return result;
}

// Adatok betöltése
async function loadData() {
    try {
        // Routes betöltése
        const routesResponse = await fetch('data/routes.txt');
        const routesText = await routesResponse.text();
        routes = parseCSV(routesText);
        console.log('Járatok betöltve:', routes.length);
        
        // Stops betöltése
        const stopsResponse = await fetch('data/stops.txt');
        const stopsText = await stopsResponse.text();
        stops = parseCSV(stopsText);
        console.log('Megállók betöltve:', stops.length);

        // Stop times betöltése
        const stopTimesResponse = await fetch('data/stop_times.txt');
        const stopTimesText = await stopTimesResponse.text();
        stopTimes = parseCSV(stopTimesText);
        console.log('Megállóidők betöltve:', stopTimes.length);

        // Trips betöltése
        const tripsResponse = await fetch('data/trips.txt');
        const tripsText = await tripsResponse.text();
        trips = parseCSV(tripsText);
        console.log('Járatok betöltve:', trips.length);

        // Dátum beállítása
        await setDefaultDate();

        // Járatok feltöltése a legördülő listába
        populateRouteSelect();

        // Megállók oldal inicializálása, ha az aktív
        if (stopsPage.style.display === 'block') {
            initializeStopsPage();
        }
    } catch (error) {
        console.error('Hiba az adatok betöltése során:', error);
        showError('Az adatok betöltése sikertelen volt.');
    }
}

// Dátum beállítása
async function setDefaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    dateSelect.value = today;
    dateSelect.min = today;

    // Maximum dátum beállítása (1 hónap a jövőben)
    const maxDate = new Date(now);
    maxDate.setMonth(maxDate.getMonth() + 1);
    const maxYear = maxDate.getFullYear();
    const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDay = String(maxDate.getDate()).padStart(2, '0');
    dateSelect.max = `${maxYear}-${maxMonth}-${maxDay}`;
}

// Járatok feltöltése a legördülő listába
function populateRouteSelect() {
    routeSelect.innerHTML = '<option value="">Válassz járatot...</option>';
    
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.route_id;
        option.textContent = `${route.route_short_name} - ${route.route_long_name}`;
        routeSelect.appendChild(option);
    });

    // Kedvenc gomb hozzáadása a route select mellé
    const favoriteBtn = document.querySelector('.favorite-route-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            const selectedRoute = routeSelect.value;
            if (selectedRoute) {
                toggleFavoriteRoute(selectedRoute);
            }
        });
    }
}

// Hibaüzenet megjelenítése
function showError(message) {
    scheduleResults.innerHTML = `
        <div class="alert alert-danger" role="alert">
            ${message}
        </div>
    `;
}

// Megállók betöltése a kiválasztott járatra
async function loadStopsForRoute() {
    const selectedRoute = routeSelect.value;
    if (!selectedRoute) return;

    console.log('Loading stops for route:', selectedRoute);

    try {
        // Trips betöltése
        const tripsResponse = await fetch('data/trips.txt');
        const tripsText = await tripsResponse.text();
        const tripsList = parseCSV(tripsText)
            .filter(trip => trip.route_id === selectedRoute);

        console.log('Found trips:', tripsList.length);
        console.log('First trip:', tripsList[0]);

        // Stop times betöltése az első trip-hez
        const stopTimesResponse = await fetch('data/stop_times.txt');
        const stopTimesText = await stopTimesResponse.text();
        
        // Irányok kinyerése
        const directions = [...new Set(tripsList.map(trip => trip.direction_id))];
        console.log('Available directions:', directions);
        
        // Irányok feltöltése a legördülő listába
        directionSelect.innerHTML = '<option value="">Válassz irányt...</option>';
        
        // Minden irányhoz megkeressük az első és utolsó megállót
        for (const directionId of directions) {
            // Az adott irányhoz tartozó első trip
            const directionTrip = tripsList.find(trip => trip.direction_id === directionId);
            if (directionTrip) {
                const tripStopTimes = parseCSV(stopTimesText)
                    .filter(st => st.trip_id === directionTrip.trip_id)
                    .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

                if (tripStopTimes.length > 0) {
                    const firstStop = stops.find(s => s.stop_id === tripStopTimes[0].stop_id);
                    const lastStop = stops.find(s => s.stop_id === tripStopTimes[tripStopTimes.length - 1].stop_id);
                    
                    if (firstStop && lastStop) {
                        const option = document.createElement('option');
                        option.value = directionId;
                        option.textContent = `${firstStop.stop_name} → ${lastStop.stop_name}`;
                        directionSelect.appendChild(option);
                    }
                }
            }
        }

        console.log('Direction select updated with options:', directionSelect.options.length);

        // Stop select törlése
        stopSelect.innerHTML = '<option value="">Válassz megállót...</option>';
    } catch (error) {
        console.error('Hiba a megállók betöltése során:', error);
        showError('A megállók betöltése sikertelen volt.');
    }
}

// Megállók betöltése az útirányhoz
async function loadStopsForDirection(routeId, directionId) {
    try {
        // Trip-ek betöltése a járathoz és útirányhoz
        const tripsResponse = await fetch('data/trips.txt');
        const tripsText = await tripsResponse.text();
        const routeTrips = parseCSV(tripsText)
            .filter(trip => trip.route_id === routeId && trip.direction_id === directionId);

        console.log('Found trips for direction:', routeTrips.length);

        // Stop times betöltése az első trip-hez
        if (routeTrips.length > 0) {
            const stopTimesResponse = await fetch('data/stop_times.txt');
            const stopTimesText = await stopTimesResponse.text();
            const tripStopTimes = parseCSV(stopTimesText)
                .filter(st => st.trip_id === routeTrips[0].trip_id)
                .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

            console.log('Found stop times:', tripStopTimes.length);

            // Megállók listájának frissítése
            updateStopSelect(tripStopTimes);

            // Első megálló automatikus kiválasztása
            if (tripStopTimes.length > 0) {
                const firstStop = stops.find(s => s.stop_id === tripStopTimes[0].stop_id);
                if (firstStop) {
                    stopSelect.value = firstStop.stop_id;
                    // Menetrend megjelenítése az első megállóhoz
                    displaySchedule(routeId, firstStop.stop_id, directionId);
                }
            }
        }
    } catch (error) {
        console.error('Hiba a megállók betöltése során:', error);
        showError('A megállók betöltése sikertelen volt.');
    }
}

// Megállók legördülő lista frissítése
function updateStopSelect(stopTimes) {
    stopSelect.innerHTML = '<option value="">Válassz megállót...</option>';
    stopTimes.forEach(stopTime => {
        const stop = stops.find(s => s.stop_id === stopTime.stop_id);
        if (stop) {
            const option = document.createElement('option');
            option.value = stop.stop_id;
            option.textContent = stop.stop_name;
            stopSelect.appendChild(option);
        }
    });
}

// Menetrend megjelenítése
async function displaySchedule(routeId, stopId, directionId) {
    try {
        // Kiválasztott dátum feldolgozása
        const selectedDate = new Date(dateSelect.value);
        
        // Naptár adatok betöltése
        const calendarResponse = await fetch('data/calendar_dates.txt');
        const calendarText = await calendarResponse.text();
        const calendarDates = parseCSV(calendarText);

        // Járatok betöltése
        const tripsResponse = await fetch('data/trips.txt');
        const tripsText = await tripsResponse.text();
        const routeTrips = parseCSV(tripsText)
            .filter(trip => trip.route_id === routeId && trip.direction_id === directionId);

        console.log('Filtered trips:', routeTrips.length);
        console.log('First trip:', routeTrips[0]);

        // Service ID-k kigyűjtése
        const serviceIds = new Set(routeTrips.map(trip => trip.service_id));
        console.log('Service IDs for route:', Array.from(serviceIds));

        // Megállóidők betöltése
        const stopTimesResponse = await fetch('data/stop_times.txt');
        const stopTimesText = await stopTimesResponse.text();
        const stopTimesList = parseCSV(stopTimesText);

        // Időpontok gyűjtése és duplikációk kiszűrése
        const uniqueTimes = new Set(
            routeTrips
                .filter(trip => {
                    // Ellenőrizzük, hogy a járat közlekedik-e a kiválasztott napon
                    const calendarDate = calendarDates.find(cd => 
                        cd.service_id === trip.service_id && 
                        cd.date === formatDate(selectedDate) &&
                        cd.exception_type === "1"
                    );
                    const isRunning = calendarDate !== undefined;
                    if (!isRunning) {
                        console.log(`Trip ${trip.trip_id} with service_id ${trip.service_id} not running on ${formatDate(selectedDate)}`);
                    }
                    return isRunning;
                })
                .map(trip => {
                    const stopTime = stopTimesList.find(st => 
                        st.trip_id === trip.trip_id && st.stop_id === stopId
                    );
                    return stopTime ? stopTime.arrival_time : null;
                })
                .filter(time => time !== null)
        );

        // Rendezett tömbbé alakítás
        const times = Array.from(uniqueTimes).sort();

        // Útirány szöveg lekérése
        const directionText = directionSelect.options[directionSelect.selectedIndex].text;

        if (times.length === 0) {
            // Gyűjtsük ki az összes dátumot, amikor a járat közlekedik
            const availableDates = new Set();
            for (const serviceId of serviceIds) {
                const dates = calendarDates
                    .filter(cd => cd.service_id === serviceId && cd.exception_type === "1")
                    .map(cd => {
                        const year = cd.date.substring(0, 4);
                        const month = cd.date.substring(4, 6);
                        const day = cd.date.substring(6, 8);
                        const date = new Date(year, month - 1, day);
                        return {
                            date: date,
                            dayName: new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(date),
                            formatted: date.toLocaleDateString('hu-HU')
                        };
                    });
                dates.forEach(d => availableDates.add(JSON.stringify(d)));
            }

            const sortedDates = Array.from(availableDates)
                .map(d => JSON.parse(d))
                .sort((a, b) => a.date - b.date);

            // Csoportosítsuk a dátumokat napok szerint
            const datesByDay = {};
            sortedDates.forEach(d => {
                if (!datesByDay[d.dayName]) {
                    datesByDay[d.dayName] = [];
                }
                datesByDay[d.dayName].push(d.formatted);
            });

            scheduleResults.innerHTML = `
                <div class="alert alert-info">
                    <h6>Nincs járat ezen a napon</h6>
                    <p>A kiválasztott dátum: ${selectedDate.toLocaleDateString('hu-HU')} (${new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(selectedDate)})</p>
                    <p>A járat a következő napokon közlekedik:</p>
                    <ul>
                        ${Object.entries(datesByDay).map(([day, dates]) => `
                            <li><strong>${day}:</strong> ${dates.join(', ')}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            displayTimes(times, directionText);
        }
    } catch (error) {
        console.error('Hiba a menetrend betöltése során:', error);
        showError('A menetrend betöltése sikertelen volt.');
    }
}

// Dátum formázása YYYYMMDD formátumban
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Időpontok megjelenítése
function displayTimes(times, direction) {
    if (times.length === 0) {
        scheduleResults.innerHTML = '<p class="text-muted">Nincs elérhető menetrendi információ.</p>';
        return;
    }

    // Aktuális idő
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Időpontok szétválasztása korábbi és következő járatokra
    const pastTimes = [];
    const upcomingTimes = [];

    times.forEach(time => {
        const [hours, minutes] = time.split(':').map(Number);
        if (hours < currentHours || (hours === currentHours && minutes < currentMinutes)) {
            pastTimes.push(time);
        } else {
            upcomingTimes.push(time);
        }
    });

    // Következő járatok listája
    const upcomingTimesList = upcomingTimes.map(time => 
        `<div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
            <div>
                <span class="time-display">${formatTime(time)}</span>
                <small class="text-muted ms-2">${direction}</small>
            </div>
            <small class="text-success">${getMinutesUntil(time)} perc múlva</small>
        </div>`
    ).join('');

    // Korábbi járatok listája
    const pastTimesList = pastTimes.map(time => 
        `<div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded text-muted">
            <div>
                <span class="time-display">${formatTime(time)}</span>
                <small class="ms-2">${direction}</small>
            </div>
        </div>`
    ).join('');

    scheduleResults.innerHTML = `
        <h6>Következő járatok:</h6>
        <div class="times-container">
            ${upcomingTimesList}
        </div>
        ${pastTimes.length > 0 ? `
            <div class="mt-3">
                <button class="btn btn-outline-secondary btn-sm" id="showPastTimesBtn">
                    Korábbi járatok mutatása (${pastTimes.length} db)
                </button>
                <div id="pastTimesContainer" class="mt-3" style="display: none;">
                    <h6 class="text-muted">Korábbi járatok:</h6>
                    ${pastTimesList}
                </div>
            </div>
        ` : ''}
    `;

    // Korábbi járatok megjelenítése/elrejtése gomb kezelése
    const showPastTimesBtn = document.getElementById('showPastTimesBtn');
    const pastTimesContainer = document.getElementById('pastTimesContainer');
    
    if (showPastTimesBtn && pastTimesContainer) {
        showPastTimesBtn.addEventListener('click', () => {
            if (pastTimesContainer.style.display === 'none') {
                pastTimesContainer.style.display = 'block';
                showPastTimesBtn.textContent = 'Korábbi járatok elrejtése';
            } else {
                pastTimesContainer.style.display = 'none';
                showPastTimesBtn.textContent = `Korábbi járatok mutatása (${pastTimes.length} db)`;
            }
        });
    }
}

// Időpont formázása
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
}

// Hátralévő percek számítása
function getMinutesUntil(time) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const tripTime = new Date(now);
    tripTime.setHours(hours, minutes, 0);
    return Math.floor((tripTime - now) / 1000 / 60);
}

// Kedvenc megálló hozzáadása/eltávolítása
function toggleFavoriteStop(stopId) {
    const index = favorites.stops.indexOf(stopId);
    if (index === -1) {
        favorites.stops.push(stopId);
    } else {
        favorites.stops.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Frissítjük a megállók listáját
    if (document.getElementById('showFavoritesBtn').classList.contains('active')) {
        displayFavoriteStops();
    } else {
        displayStopsList();
    }
}

// Kedvenc útvonalak kezelése
function toggleFavoriteRoute(routeId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    const index = favorites.indexOf(routeId);
    
    if (index === -1) {
        favorites.push(routeId);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('favoriteRoutes', JSON.stringify(favorites));
    updateFavoriteRouteButton(routeId);
    displayFavoriteRoutes();
}

function updateFavoriteRouteButton(routeId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    const isFavorite = favorites.includes(routeId);
    const favoriteBtn = document.querySelector(`#route-${routeId} .favorite-btn`);
    
    if (favoriteBtn) {
        favoriteBtn.innerHTML = isFavorite ? 
            '<i class="bi bi-star-fill"></i>' : 
            '<i class="bi bi-star"></i>';
        favoriteBtn.classList.toggle('active', isFavorite);
    }
}

function displayFavoriteRoutes() {
    const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    const favoriteRoutesList = document.getElementById('favoriteRoutesList');
    const favoriteRoutesBadge = document.getElementById('favoriteRoutesBadge');
    
    if (!favoriteRoutesList) return;
    
    // Csak akkor frissítjük a badge-et, ha létezik
    if (favoriteRoutesBadge) {
        favoriteRoutesBadge.textContent = favorites.length;
    }
    
    if (favorites.length === 0) {
        favoriteRoutesList.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nincs mentett kedvenc útvonal.
            </div>
        `;
        return;
    }
    
    favoriteRoutesList.innerHTML = '';
    
    favorites.forEach(routeId => {
        const route = routes.find(r => r.route_id === routeId);
        if (!route) return;
        
        const routeItem = document.createElement('div');
        routeItem.className = 'favorite-route-item';
        routeItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${route.route_short_name} - ${route.route_long_name}</h6>
                    <small class="text-muted">${route.route_desc || 'Nincs leírás'}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger remove-favorite" data-route-id="${route.route_id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        // Kártyára kattintás eseménykezelő
        routeItem.addEventListener('click', async (e) => {
            // Ha a törlés gombra kattintottak, ne csináljunk semmit
            if (e.target.closest('.remove-favorite')) return;
            
            const route = routes.find(r => r.route_id === routeId);
            if (!route) return;
            
            try {
                // Útvonal kiválasztása
                routeSelect.value = routeId;
                
                // Megállók betöltése
                await loadStopsForRoute(routeId);
                
                // Várunk egy kicsit, hogy a directionSelect feltöltődjön
                setTimeout(async () => {
                    const directionSelect = document.getElementById('directionSelect');
                    if (directionSelect && directionSelect.options.length > 1) {
                        // Az első irány kiválasztása (a 0. index az üres opció)
                        directionSelect.value = directionSelect.options[1].value;
                        
                        // Megállók betöltése az irányhoz
                        await loadStopsForDirection(routeId, directionSelect.value);
                        
                        // Várunk egy kicsit, hogy a stopSelect feltöltődjön
                        setTimeout(async () => {
                            const stopSelect = document.getElementById('stopSelect');
                            if (stopSelect && stopSelect.options.length > 1) {
                                // Az első megálló (kiindulópont) kiválasztása
                                stopSelect.value = stopSelect.options[1].value;
                                
                                // Menetrend megjelenítése
                                await displaySchedule(routeId, stopSelect.value, directionSelect.value);
                            }
                        }, 300);
                    }
                }, 300);
            } catch (error) {
                console.error('Hiba a kedvenc útvonal betöltése során:', error);
                showError('A kedvenc útvonal betöltése sikertelen volt.');
            }
        });
        
        favoriteRoutesList.appendChild(routeItem);
    });
    
    // Törlés gomb eseménykezelői
    favoriteRoutesList.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Megakadályozza, hogy a kártyára kattintás is megtörténjen
            const routeId = e.currentTarget.dataset.routeId;
            toggleFavoriteRoute(routeId);
        });
    });
}

// Kedvenc megállók megjelenítése
function displayFavoriteStops() {
    const showFavoritesBtn = document.getElementById('showFavoritesBtn');
    const nearbyStopsBtn = document.getElementById('nearbyStopsBtn');
    const nearbyStopsInfo = document.getElementById('nearbyStopsInfo');
    
    showFavoritesBtn.classList.add('active');
    nearbyStopsBtn.classList.remove('active');
    nearbyStopsInfo.style.display = 'none';
    isShowingNearbyStops = false;
    
    const favoriteStops = stops.filter(stop => favorites.stops.includes(stop.stop_id));
    if (favoriteStops.length === 0) {
        stopsList.innerHTML = '<p class="text-muted">Nincs kedvenc megálló.</p>';
    } else {
        displayStopsList(favoriteStops);
    }
}

// Megálló kiválasztása
function selectStop(stop) {
    selectedStop = stop;
    displayStopSchedule(stop);
    
    // Aktív elem frissítése
    const stopsList = document.getElementById('stopsList');
    if (stopsList) {
        stopsList.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.toggle('active', item.dataset.stopId === stop.stop_id);
        });
    }
}

// Loading spinner megjelenítése
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
        </div>
    `;
}

// Megállók listázása
function displayStopsList(filteredStops = null) {
    const stopsList = document.getElementById('stopsList');
    if (!stopsList) return;

    // Loading spinner megjelenítése
    showLoading(stopsList);

    const stopsToDisplay = Array.isArray(filteredStops) ? filteredStops : stops;
    const searchInput = document.getElementById('stopFilter');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    // Késleltetés a spinner megjelenítéséhez
    setTimeout(() => {
        // Megállók csoportosítása név szerint
        const groupedStops = stopsToDisplay.reduce((acc, stop) => {
            const name = stop.stop_name;
            if (!acc[name]) {
                acc[name] = [];
            }
            acc[name].push(stop);
            return acc;
        }, {});

        // Szűrés a keresési feltétel alapján
        const filteredNames = Object.keys(groupedStops).filter(name =>
            name.toLowerCase().includes(searchTerm)
        );

        if (filteredNames.length === 0) {
            stopsList.innerHTML = '<p class="text-muted">Nincs találat.</p>';
            return;
        }

        stopsList.innerHTML = filteredNames.map(name => {
            const stopsAtLocation = groupedStops[name];
            return stopsAtLocation.map((stop, index) => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${stop.stop_name}</h6>
                        <small class="text-muted">Irány: ${index === 0 ? 'Felfelé' : 'Lefelé'}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm favorite-btn ${favorites.stops.includes(stop.stop_id) ? 'btn-warning' : 'btn-outline-secondary'}" 
                                data-stop-id="${stop.stop_id}">
                                <i class="bi bi-star${favorites.stops.includes(stop.stop_id) ? '-fill' : ''}"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }).join('');

        // Eseményfigyelők hozzáadása
        addStopListEventListeners(stopsList, groupedStops);
    }, 300); // 300ms késleltetés a spinner megjelenítéséhez
}

// Eseményfigyelők hozzáadása a megállók listájához
function addStopListEventListeners(stopsList, groupedStops) {
    // Megállók eseményfigyelői
    stopsList.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', () => {
            const stopName = item.querySelector('h6').textContent;
            const direction = item.querySelector('small').textContent;
            const stopsAtLocation = groupedStops[stopName];
            const stop = stopsAtLocation[direction.includes('Felfelé') ? 0 : 1];
            if (stop) {
                selectStop(stop);
            }
        });
    });

    // Kedvenc gombok eseményfigyelői
    stopsList.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stopId = btn.dataset.stopId;
            toggleFavoriteStop(stopId);
        });
    });
}

// Megálló menetrendjének megjelenítése
async function displayStopSchedule(stop) {
    try {
        // Loading spinner megjelenítése
        showLoading(stopsScheduleResults);

        const directionIndex = stops
            .filter(s => s.stop_name === stop.stop_name)
            .findIndex(s => s.stop_id === stop.stop_id);
            
        stopsScheduleTitle.textContent = `${stop.stop_name} (${directionIndex === 0 ? 'Felfelé' : 'Lefelé'})`;
        
        // Aktuális idő
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Stop times betöltése
        const stopTimesResponse = await fetch('data/stop_times.txt');
        const stopTimesText = await stopTimesResponse.text();
        const allStopTimes = parseCSV(stopTimesText);

        // Trip-ek betöltése
        const tripsResponse = await fetch('data/trips.txt');
        const tripsText = await tripsResponse.text();
        const tripsList = parseCSV(tripsText);

        // Routes betöltése
        const routesResponse = await fetch('data/routes.txt');
        const routesText = await routesResponse.text();
        const routesList = parseCSV(routesText);

        // Calendar dates betöltése a mai naphoz
        const calendarResponse = await fetch('data/calendar_dates.txt');
        const calendarText = await calendarResponse.text();
        const calendarDates = parseCSV(calendarText);
        const today = formatDate(now);

        // Következő járatok összegyűjtése
        const upcomingTrips = new Map();
        
        // A megálló időpontjainak szűrése
        const stopTimesList = allStopTimes.filter(st => st.stop_id === stop.stop_id);

        for (const stopTime of stopTimesList) {
            const [hours, minutes] = stopTime.arrival_time.split(':').map(Number);
            const minutesUntil = getMinutesUntil(stopTime.arrival_time);
            
            // Csak akkor adjuk hozzá, ha még nem ment el a járat és 90 percen belül érkezik
            if (minutesUntil > 0 && minutesUntil <= 90) {
                const trip = tripsList.find(t => t.trip_id === stopTime.trip_id);
                if (trip) {
                    // Ellenőrizzük, hogy a járat közlekedik-e ma
                    const isRunningToday = calendarDates.some(cd => 
                        cd.service_id === trip.service_id && 
                        cd.date === today &&
                        cd.exception_type === "1"
                    );

                    if (!isRunningToday) continue;

                    const route = routesList.find(r => r.route_id === trip.route_id);
                    if (route) {
                        // Megkeressük a járat összes megállóját
                        const tripStops = allStopTimes
                            .filter(st => st.trip_id === trip.trip_id)
                            .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

                        // Első és utolsó megálló
                        const firstStop = stops.find(s => s.stop_id === tripStops[0]?.stop_id);
                        const lastStop = stops.find(s => s.stop_id === tripStops[tripStops.length - 1]?.stop_id);

                        if (firstStop && lastStop) {
                            const direction = `${firstStop.stop_name} → ${lastStop.stop_name}`;

                            // Kulcs generálása az időpont alapján
                            const key = stopTime.arrival_time;
                            
                            if (!upcomingTrips.has(key)) {
                                upcomingTrips.set(key, {
                                    routeNumber: route.route_short_name,
                                    time: stopTime.arrival_time,
                                    minutesUntil: minutesUntil,
                                    direction: direction
                                });
                            }
                        }
                    }
                }
            }
        }

        // Konvertáljuk a Map értékeit tömbbé és rendezzük időpont szerint
        const sortedTrips = Array.from(upcomingTrips.values())
            .sort((a, b) => a.minutesUntil - b.minutesUntil);

        // Menetrend megjelenítése
        if (sortedTrips.length === 0) {
            stopsScheduleResults.innerHTML = '<p class="text-muted">Nincs több járat a következő másfél órában.</p>';
            return;
        }
        
        stopsScheduleResults.innerHTML = `
            <div class="upcoming-trips">
                ${sortedTrips.map(trip => `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                        <div class="d-flex align-items-center">
                            <span class="badge bg-secondary me-2">${trip.routeNumber}</span>
                            <span class="time-display me-2">${formatTime(trip.time)}</span>
                            <small class="text-muted">${trip.direction}</small>
                        </div>
                        <small class="text-success ms-2">${trip.minutesUntil} perc múlva</small>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Hiba a megálló menetrendjének betöltése során:', error);
        stopsScheduleResults.innerHTML = '<p class="text-muted">Hiba történt a menetrend betöltése során.</p>';
    }
}

// Geolokáció lekérése
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('A böngésző nem támogatja a helymeghatározást.'));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        }
    });
}

// Távolság számítása két koordináta között (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Föld sugara km-ben
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    return d;
}

// Fokok átváltása radiánba
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Kedvencek betöltése
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }

    loadData();
    
    // Járat kiválasztása eseménykezelő
    if (routeSelect) {
        routeSelect.addEventListener('change', () => {
            const selectedRoute = routeSelect.value;
            if (selectedRoute) {
                loadStopsForRoute(selectedRoute);
                updateFavoriteRouteButton(selectedRoute);
            }
        });
    }

    // Útirány kiválasztása eseménykezelő
    if (directionSelect) {
        directionSelect.addEventListener('change', () => {
            const selectedRoute = routeSelect.value;
            const selectedDirection = directionSelect.value;
            if (selectedRoute && selectedDirection) {
                loadStopsForDirection(selectedRoute, selectedDirection);
            }
        });
    }

    // Stop kiválasztása eseménykezelő
    if (stopSelect) {
        stopSelect.addEventListener('change', () => {
            const selectedRoute = routeSelect.value;
            const selectedDirection = directionSelect.value;
            const selectedStop = stopSelect.value;
            if (selectedRoute && selectedDirection && selectedStop) {
                displaySchedule(selectedRoute, selectedStop, selectedDirection);
            }
        });
    }

    // Kedvenc megállók gomb eseménykezelője
    const showFavoritesBtn = document.getElementById('showFavoritesBtn');
    if (showFavoritesBtn) {
        showFavoritesBtn.addEventListener('click', () => {
            if (showFavoritesBtn.classList.contains('active')) {
                // Vissza a teljes listához
                showFavoritesBtn.classList.remove('active');
                displayStopsList();
            } else {
                // Kedvenc megállók mutatása
                displayFavoriteStops();
            }
        });
    }

    // Közeli megállók gomb eseménykezelője
    const nearbyStopsBtn = document.getElementById('nearbyStopsBtn');
    if (nearbyStopsBtn) {
        nearbyStopsBtn.addEventListener('click', () => {
            if (isShowingNearbyStops) {
                // Vissza a teljes listához
                isShowingNearbyStops = false;
                document.getElementById('nearbyStopsInfo').style.display = 'none';
                nearbyStopsBtn.classList.remove('active');
                displayStopsList();
            } else {
                // Közeli megállók mutatása
                showNearbyStops();
            }
        });
    }

    // Keresőmező eseménykezelő
    const stopSearch = document.getElementById('stopFilter');
    if (stopSearch) {
        stopSearch.addEventListener('input', () => {
            if (isShowingNearbyStops) {
                showNearbyStops();
            } else if (showFavoritesBtn && showFavoritesBtn.classList.contains('active')) {
                displayFavoriteStops();
            } else {
                displayStopsList();
            }
        });
    }

    // Kedvenc járatok gomb eseménykezelője
    const showFavoriteRoutesBtn = document.getElementById('showFavoriteRoutesBtn');
    if (showFavoriteRoutesBtn) {
        showFavoriteRoutesBtn.addEventListener('click', () => {
            const btn = showFavoriteRoutesBtn;
            const favoriteRoutes = document.getElementById('favoriteRoutes');
            
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                favoriteRoutes.style.display = 'none';
            } else {
                btn.classList.add('active');
                favoriteRoutes.style.display = 'block';
                displayFavoriteRoutes();
            }
        });
    }
});

// Oldalváltás kezelése
document.getElementById('routesLink').addEventListener('click', () => {
    document.getElementById('routesPage').style.display = 'block';
    stopsPage.style.display = 'none';
});

document.getElementById('stopsLink').addEventListener('click', () => {
    document.getElementById('routesPage').style.display = 'none';
    stopsPage.style.display = 'block';
    initializeStopsPage();
});

// Megállók oldal inicializálása
async function initializeStopsPage() {
    try {
        // Dátum beállítása
        await setDefaultDate();
        stopsDateSelect.value = dateSelect.value;
        stopsDateSelect.min = dateSelect.min;
        stopsDateSelect.max = dateSelect.max;

        // Megállók listázása
        displayStopsList();

        // Alapértelmezett megálló (Avas kilátó) megjelenítése
        const defaultStop = stops.find(s => s.stop_name.includes('Avas kilátó'));
        if (defaultStop) {
            displayStopSchedule(defaultStop);
            // Megkeressük és kijelöljük a listában is
            const listItems = stopsList.querySelectorAll('.list-group-item');
            listItems.forEach(item => {
                if (item.textContent === defaultStop.stop_name) {
                    item.classList.add('active');
                }
            });
        }
    } catch (error) {
        console.error('Hiba a megállók oldal inicializálása során:', error);
        showError('A megállók oldal betöltése sikertelen volt.');
    }
}

// Geolokáció lekérése és közeli megállók megjelenítése
async function showNearbyStops() {
    const nearbyStopsBtn = document.getElementById('nearbyStopsBtn');
    const showFavoritesBtn = document.getElementById('showFavoritesBtn');
    const nearbyStopsInfo = document.getElementById('nearbyStopsInfo');
    
    nearbyStopsBtn.classList.add('active');
    showFavoritesBtn.classList.remove('active');
    nearbyStopsInfo.style.display = 'block';
    nearbyStopsInfo.innerHTML = '<i class="bi bi-info-circle"></i> Helymeghatározás folyamatban...';

    try {
        const position = await getCurrentPosition();
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Megállók csoportosítása név szerint
        const stopGroups = stops.reduce((acc, stop) => {
            if (!acc[stop.stop_name]) {
                acc[stop.stop_name] = [];
            }
            acc[stop.stop_name].push(stop);
            return acc;
        }, {});

        // Minden megállócsoporthoz kiszámoljuk a legközelebbi megálló távolságát
        const stopsWithDistance = Object.entries(stopGroups).map(([name, groupStops]) => {
            // A csoport összes megállójának távolsága
            const distances = groupStops.map(stop => ({
                stop: stop,
                distance: calculateDistance(
                    userLat, 
                    userLon, 
                    parseFloat(stop.stop_lat), 
                    parseFloat(stop.stop_lon)
                )
            }));
            
            // A legközelebbi távolság a csoportból
            const minDistance = Math.min(...distances.map(d => d.distance));
            
            return {
                name: name,
                stops: groupStops,
                distance: minDistance
            };
        });

        // Rendezés távolság szerint és a legközelebbi 10 megállócsoport kiválasztása
        const nearbyStopGroups = stopsWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);

        // Visszaalakítjuk a stops tömb formátumára
        const nearbyStops = nearbyStopGroups.flatMap(group => group.stops);

        isShowingNearbyStops = true;
        displayStopsList(nearbyStops);
        
        nearbyStopsInfo.innerHTML = 
            '<i class="bi bi-info-circle"></i> A 10 legközelebbi megálló (kattints a <i class="bi bi-geo-alt"></i> gombra a teljes lista megjelenítéséhez)';
    } catch (error) {
        console.error('Hiba a helymeghatározás során:', error);
        nearbyStopsInfo.innerHTML = 
            '<i class="bi bi-exclamation-triangle"></i> A helymeghatározás nem sikerült. Kérjük, engedélyezd a helymeghatározást a böngészőben.';
    }
}

// Debounce függvény
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keresés optimalizálása
const searchInput = document.getElementById('stopFilter');
if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredStops = stops.filter(stop => 
            stop.stop_name.toLowerCase().includes(searchTerm)
        );
        displayStopsList(filteredStops);
    }, 300));
} 