
// Globale Variablen
let selectedStationCount = 0;
let selectedStations = [];
let refreshInterval;
let currentLanguage = 'de';

// Übersetzungen
const translations = {
    de: {
        title: 'ZVV Abfahrtszeiten',
        stationCountQuestion: 'Wie viele Stationen möchten Sie anzeigen?',
        customizeStations: 'Stationen anpassen',
        tramColor: 'Tram-Farbe:',
        busColor: 'Bus-Farbe:',
        trainColor: 'Zug-Farbe:',
        startDisplay: 'Anzeige starten',
        loading: 'Lade Abfahrtszeiten...',
        footer: 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
        changeStations: 'Stationen ändern',
        lineColors: 'Linien-Farben anpassen',
        colorFor: 'Farbe für Linie',
        selectColor: 'auswählen',
        apply: 'Übernehmen',
        cancel: 'Abbrechen',
        line: 'Linie',
        destination: 'Ziel',
        platform: 'Gleis',
        departure: 'Abfahrt',
        noData: 'Keine Daten verfügbar',
        delay: 'Verspätung'
    },
    en: {
        title: 'ZVV Departure Times',
        stationCountQuestion: 'How many stations would you like to display?',
        customizeStations: 'Customize stations',
        tramColor: 'Tram Color:',
        busColor: 'Bus Color:',
        trainColor: 'Train Color:',
        startDisplay: 'Start Display',
        loading: 'Loading departure times...',
        footer: 'Data from transport.opendata.ch | Updates every 25 seconds',
        changeStations: 'Change Stations',
        lineColors: 'Customize Line Colors',
        colorFor: 'Color for line',
        selectColor: 'select',
        apply: 'Apply',
        cancel: 'Cancel',
        line: 'Line',
        destination: 'Destination',
        platform: 'Platform',
        departure: 'Departure',
        noData: 'No data available',
        delay: 'Delay'
    }
};

// DOM-Elemente
const stationCountSelection = document.getElementById('station-count-selection');
const stationSelection = document.getElementById('station-selection');
const stationCustomization = document.getElementById('station-customization');
const dynamicBoards = document.getElementById('dynamic-boards');
const loading = document.getElementById('loading');
const changeStationsBtn = document.getElementById('change-stations');
const languageSelector = document.getElementById('language-selector');
const languageDropdown = document.getElementById('language-dropdown');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Station Count Selection
    const stationCountButtons = document.querySelectorAll('.station-count-btn');
    stationCountButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            stationCountButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            this.classList.add('selected');
            
            selectedStationCount = parseInt(this.dataset.count);
            console.log('Selected station count:', selectedStationCount);
            
            // Proceed to station selection
            setTimeout(() => {
                proceedToStationSelection();
            }, 300);
        });
    });

    // Change stations button
    if (changeStationsBtn) {
        changeStationsBtn.addEventListener('click', resetToStationCount);
    }

    // Language selector
    if (languageSelector) {
        languageSelector.addEventListener('click', function() {
            languageDropdown.classList.toggle('hidden');
        });
    }

    // Language options
    const languageOptions = document.querySelectorAll('.language-option');
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.dataset.lang;
            changeLanguage(lang);
            languageDropdown.classList.add('hidden');
        });
    });

    // Close language dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!languageSelector.contains(event.target) && !languageDropdown.contains(event.target)) {
            languageDropdown.classList.add('hidden');
        }
    });
});

function proceedToStationSelection() {
    console.log('Proceeding to station selection with count:', selectedStationCount);
    
    stationCountSelection.classList.add('hidden');
    stationSelection.classList.remove('hidden');
    
    createStationInputs();
}

function createStationInputs() {
    const container = document.querySelector('.dynamic-input-container');
    container.innerHTML = '';
    
    // Create grid layout based on station count
    if (selectedStationCount <= 2) {
        container.style.gridTemplateColumns = 'repeat(' + selectedStationCount + ', 1fr)';
    } else if (selectedStationCount <= 4) {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
        container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        inputGroup.innerHTML = `
            <label for="station-${i}">Station ${i}:</label>
            <div class="search-container">
                <input type="text" id="station-${i}" placeholder="Station eingeben..." autocomplete="off">
                <div class="suggestions" id="suggestions-${i}"></div>
            </div>
        `;
        container.appendChild(inputGroup);
        
        // Add event listeners for search
        const input = inputGroup.querySelector('input');
        const suggestions = inputGroup.querySelector('.suggestions');
        
        input.addEventListener('input', function() {
            handleStationSearch(this, suggestions, i);
        });
        
        input.addEventListener('blur', function() {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => {
                suggestions.style.display = 'none';
            }, 200);
        });
        
        input.addEventListener('focus', function() {
            if (this.value.length >= 2) {
                handleStationSearch(this, suggestions, i);
            }
        });
    }
    
    // Add start button
    const startButton = document.createElement('button');
    startButton.className = 'start-btn';
    startButton.textContent = translations[currentLanguage].startDisplay;
    startButton.style.marginTop = '20px';
    startButton.addEventListener('click', proceedToCustomization);
    container.appendChild(startButton);
}

async function handleStationSearch(input, suggestionsDiv, stationIndex) {
    const query = input.value.trim();
    console.log('Searching for station:', query);
    
    if (query.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/locations?query=${encodeURIComponent(query)}`);
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stations = await response.json();
        console.log('Received stations:', stations);
        
        displaySuggestions(stations, suggestionsDiv, input, stationIndex);
    } catch (error) {
        console.error('Error fetching stations:', error);
        suggestionsDiv.innerHTML = '<div class="suggestion-item">Fehler beim Laden der Stationen</div>';
        suggestionsDiv.style.display = 'block';
    }
}

function displaySuggestions(stations, suggestionsDiv, input, stationIndex) {
    suggestionsDiv.innerHTML = '';
    
    if (stations.length === 0) {
        suggestionsDiv.innerHTML = '<div class="suggestion-item">Keine Stationen gefunden</div>';
        suggestionsDiv.style.display = 'block';
        return;
    }
    
    stations.forEach(station => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = station.name;
        item.addEventListener('click', function() {
            input.value = station.name;
            input.dataset.stationId = station.id;
            suggestionsDiv.style.display = 'none';
            console.log('Selected station:', station.name, 'ID:', station.id);
        });
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
}

function proceedToCustomization() {
    // Collect selected stations
    selectedStations = [];
    for (let i = 1; i <= selectedStationCount; i++) {
        const input = document.getElementById(`station-${i}`);
        if (input && input.value && input.dataset.stationId) {
            selectedStations.push({
                name: input.value,
                id: input.dataset.stationId,
                customName: input.value
            });
        }
    }
    
    console.log('Selected stations:', selectedStations);
    
    if (selectedStations.length !== selectedStationCount) {
        alert('Bitte wählen Sie alle Stationen aus der Liste aus.');
        return;
    }
    
    stationSelection.classList.add('hidden');
    stationCustomization.classList.remove('hidden');
    
    createCustomizationInputs();
}

function createCustomizationInputs() {
    const container = document.querySelector('.customization-container');
    container.innerHTML = '';
    
    // Set grid layout
    if (selectedStations.length <= 2) {
        container.style.gridTemplateColumns = 'repeat(' + selectedStations.length + ', 1fr)';
    } else if (selectedStations.length <= 4) {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
        container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
    
    selectedStations.forEach((station, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-input-group';
        inputGroup.innerHTML = `
            <label for="custom-station-${index}">Station ${index + 1} Anzeigename:</label>
            <input type="text" id="custom-station-${index}" value="${station.name}" placeholder="Anzeigename eingeben...">
        `;
        container.appendChild(inputGroup);
    });
    
    // Add apply button event listener
    const applyBtn = document.getElementById('apply-customization');
    if (applyBtn) {
        applyBtn.replaceWith(applyBtn.cloneNode(true)); // Remove old listeners
        document.getElementById('apply-customization').addEventListener('click', startDisplay);
    }
}

function startDisplay() {
    // Update custom names
    selectedStations.forEach((station, index) => {
        const input = document.getElementById(`custom-station-${index}`);
        if (input) {
            station.customName = input.value || station.name;
        }
    });
    
    console.log('Starting display with stations:', selectedStations);
    
    stationCustomization.classList.add('hidden');
    dynamicBoards.classList.remove('hidden');
    changeStationsBtn.classList.remove('hidden');
    
    createDynamicBoards();
    startDataRefresh();
}

function createDynamicBoards() {
    dynamicBoards.innerHTML = '';
    dynamicBoards.className = `dynamic-boards stations-${selectedStationCount}`;
    
    selectedStations.forEach((station, index) => {
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        boardContainer.innerHTML = `
            <div class="station-header">
                <h2>${station.customName}</h2>
                <div class="last-updated" id="updated-${index}">Zuletzt aktualisiert: --</div>
            </div>
            <div class="departure-board">
                <div class="board-header">
                    <div class="header-line">${translations[currentLanguage].line}</div>
                    <div class="header-destination">${translations[currentLanguage].destination}</div>
                    <div class="header-platform">${translations[currentLanguage].platform}</div>
                    <div class="header-departure">${translations[currentLanguage].departure}</div>
                </div>
                <div class="departures-list" id="departures-${index}">
                    <div class="no-data">${translations[currentLanguage].loading}</div>
                </div>
            </div>
        `;
        dynamicBoards.appendChild(boardContainer);
    });
}

async function loadDepartures(stationId, index) {
    try {
        const response = await fetch(`/api/board?station=${encodeURIComponent(stationId)}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayDepartures(data.departures, index);
        
        // Update timestamp
        const updatedElement = document.getElementById(`updated-${index}`);
        if (updatedElement) {
            updatedElement.textContent = `Zuletzt aktualisiert: ${new Date().toLocaleTimeString()}`;
        }
        
    } catch (error) {
        console.error('Error loading departures:', error);
        const departuresContainer = document.getElementById(`departures-${index}`);
        if (departuresContainer) {
            departuresContainer.innerHTML = `<div class="no-data">Fehler beim Laden der Daten</div>`;
        }
    }
}

function displayDepartures(departures, index) {
    const container = document.getElementById(`departures-${index}`);
    if (!container) return;
    
    if (!departures || departures.length === 0) {
        container.innerHTML = `<div class="no-data">${translations[currentLanguage].noData}</div>`;
        return;
    }
    
    const departuresHTML = departures.map(dep => {
        const departureTime = new Date(dep.departure);
        const now = new Date();
        const minutesUntil = Math.max(0, Math.round((departureTime - now) / 1000 / 60));
        
        let timeDisplay = minutesUntil === 0 ? 'Jetzt' : `${minutesUntil} min`;
        let delayDisplay = '';
        
        if (dep.delay > 0) {
            delayDisplay = `<span class="delay">+${dep.delay}min</span>`;
        }
        
        let lineClass = 'line-number';
        if (dep.category) {
            const category = dep.category.toLowerCase();
            if (category.includes('bus')) lineClass += ' bus';
            else if (category.includes('tram')) lineClass += ' tram';
        }
        
        return `
            <div class="departure-row">
                <div class="${lineClass}">${dep.line}</div>
                <div class="destination">${dep.destination}</div>
                <div class="platform">${dep.platform || '-'}</div>
                <div class="departure-time">${timeDisplay} ${delayDisplay}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = departuresHTML;
}

function startDataRefresh() {
    // Initial load
    selectedStations.forEach((station, index) => {
        loadDepartures(station.id, index);
    });
    
    // Set up refresh interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        selectedStations.forEach((station, index) => {
            loadDepartures(station.id, index);
        });
    }, 25000); // 25 seconds
}

function resetToStationCount() {
    // Clear intervals
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    // Hide all phases except station count
    stationSelection.classList.add('hidden');
    stationCustomization.classList.add('hidden');
    dynamicBoards.classList.add('hidden');
    changeStationsBtn.classList.add('hidden');
    stationCountSelection.classList.remove('hidden');
    
    // Reset selections
    selectedStationCount = 0;
    selectedStations = [];
    
    // Remove selected class from buttons
    document.querySelectorAll('.station-count-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function changeLanguage(lang) {
    currentLanguage = lang;
    
    // Update language selector button
    const flagMap = { de: '🇩🇪', en: '🇬🇧' };
    languageSelector.textContent = `🌐 ${lang.toUpperCase()}`;
    
    // Update all translatable elements
    updateTranslations();
}

function updateTranslations() {
    const t = translations[currentLanguage];
    
    // Update static elements
    document.querySelector('h1').textContent = t.title;
    document.querySelector('.station-count-selection h2').textContent = t.stationCountQuestion;
    
    // Update customization phase
    const customizationH2 = document.querySelector('.station-customization h2');
    if (customizationH2) customizationH2.textContent = t.customizeStations;
    
    const customizationH3 = document.querySelector('.color-customization h3');
    if (customizationH3) customizationH3.textContent = t.lineColors;
    
    // Update color labels
    const tramLabel = document.querySelector('label[for="tram-color"]');
    if (tramLabel) tramLabel.textContent = t.tramColor;
    
    const busLabel = document.querySelector('label[for="bus-color"]');
    if (busLabel) busLabel.textContent = t.busColor;
    
    const trainLabel = document.querySelector('label[for="train-color"]');
    if (trainLabel) trainLabel.textContent = t.trainColor;
    
    // Update buttons
    const applyBtn = document.getElementById('apply-customization');
    if (applyBtn) applyBtn.textContent = t.startDisplay;
    
    const changeBtn = document.getElementById('change-stations');
    if (changeBtn) changeBtn.textContent = t.changeStations;
    
    // Update footer
    const footer = document.querySelector('footer p');
    if (footer) footer.textContent = t.footer;
    
    // Update loading text
    const loadingText = document.querySelector('.loading p');
    if (loadingText) loadingText.textContent = t.loading;
    
    // Update board headers if they exist
    document.querySelectorAll('.header-line').forEach(el => el.textContent = t.line);
    document.querySelectorAll('.header-destination').forEach(el => el.textContent = t.destination);
    document.querySelectorAll('.header-platform').forEach(el => el.textContent = t.platform);
    document.querySelectorAll('.header-departure').forEach(el => el.textContent = t.departure);
}
