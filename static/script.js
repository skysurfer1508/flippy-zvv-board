
// Global variables
let selectedStationCount = 0;
let selectedStations = [];
let updateInterval;
let currentLanguage = 'de';

// Language translations
const translations = {
    de: {
        title: 'ZVV Abfahrtszeiten',
        howManyStations: 'Wie viele Stationen möchten Sie anzeigen?',
        customizeStations: 'Stationen anpassen',
        customizeColors: 'Linien-Farben anpassen',
        tramColor: 'Tram-Farbe:',
        busColor: 'Bus-Farbe:',
        trainColor: 'Zug-Farbe:',
        startDisplay: 'Anzeige starten',
        changeStations: 'Stationen ändern',
        loading: 'Lade Abfahrtszeiten...',
        dataSource: 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
        noData: 'Keine Abfahrten verfügbar',
        line: 'Linie',
        destination: 'Ziel',
        platform: 'Gleis',
        departure: 'Abfahrt',
        delay: 'Verspätung',
        lastUpdate: 'Letzte Aktualisierung',
        station: 'Station',
        selectColor: 'Farbe für Linie',
        choose: 'auswählen',
        apply: 'Übernehmen',
        cancel: 'Abbrechen'
    },
    en: {
        title: 'ZVV Departure Times',
        howManyStations: 'How many stations would you like to display?',
        customizeStations: 'Customize Stations',
        customizeColors: 'Customize Line Colors',
        tramColor: 'Tram Color:',
        busColor: 'Bus Color:',
        trainColor: 'Train Color:',
        startDisplay: 'Start Display',
        changeStations: 'Change Stations',
        loading: 'Loading departure times...',
        dataSource: 'Data from transport.opendata.ch | Updates every 25 seconds',
        noData: 'No departures available',
        line: 'Line',
        destination: 'Destination',
        platform: 'Platform',
        departure: 'Departure',
        delay: 'Delay',
        lastUpdate: 'Last Update',
        station: 'Station',
        selectColor: 'Select color for line',
        choose: 'choose',
        apply: 'Apply',
        cancel: 'Cancel'
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    setupStationCountSelection();
    setupLanguageSelector();
    updateLanguage();
}

function setupStationCountSelection() {
    const stationCountButtons = document.querySelectorAll('.station-count-btn');
    console.log('Found station count buttons:', stationCountButtons.length);
    
    stationCountButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            stationCountButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Store selected count
            selectedStationCount = parseInt(this.dataset.count);
            console.log('Selected station count:', selectedStationCount);
            
            // Show station selection phase
            setTimeout(() => {
                showStationSelection();
            }, 300);
        });
    });
}

function showStationSelection() {
    console.log('Showing station selection for', selectedStationCount, 'stations');
    
    // Hide station count selection
    document.getElementById('station-count-selection').classList.add('hidden');
    
    // Show station selection
    const stationSelection = document.getElementById('station-selection');
    stationSelection.classList.remove('hidden');
    
    // Generate dynamic input fields
    generateStationInputs();
}

function generateStationInputs() {
    const container = document.querySelector('.dynamic-input-container');
    container.innerHTML = '';
    
    // Set grid columns based on station count
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
            <label for="station-${i}">${translations[currentLanguage].station} ${i}:</label>
            <div class="search-container">
                <input type="text" 
                       id="station-${i}" 
                       name="station-${i}"
                       placeholder="${translations[currentLanguage].station} ${i} eingeben..."
                       autocomplete="off">
                <div class="suggestions" id="suggestions-${i}"></div>
            </div>
        `;
        
        container.appendChild(inputGroup);
    }
    
    // Add continue button
    const continueBtn = document.createElement('button');
    continueBtn.id = 'continue-to-customization';
    continueBtn.className = 'start-btn';
    continueBtn.textContent = 'Weiter zur Anpassung';
    continueBtn.disabled = true;
    container.appendChild(continueBtn);
    
    // Setup input event listeners
    setupStationInputs();
}

function setupStationInputs() {
    console.log('Setting up station inputs...');
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const input = document.getElementById(`station-${i}`);
        const suggestionsDiv = document.getElementById(`suggestions-${i}`);
        
        if (input && suggestionsDiv) {
            console.log(`Setting up input for station ${i}`);
            
            let debounceTimer;
            
            input.addEventListener('input', function() {
                const query = this.value.trim();
                console.log(`Input for station ${i}:`, query);
                
                clearTimeout(debounceTimer);
                
                if (query.length >= 2) {
                    debounceTimer = setTimeout(() => {
                        searchStations(query, suggestionsDiv, input, i);
                    }, 300);
                } else {
                    suggestionsDiv.style.display = 'none';
                    suggestionsDiv.innerHTML = '';
                }
                
                checkAllStationsSelected();
            });
            
            input.addEventListener('focus', function() {
                if (this.value.length >= 2) {
                    searchStations(this.value, suggestionsDiv, input, i);
                }
            });
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', function(e) {
                if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.style.display = 'none';
                }
            });
        } else {
            console.error(`Could not find input or suggestions div for station ${i}`);
        }
    }
    
    // Setup continue button
    const continueBtn = document.getElementById('continue-to-customization');
    if (continueBtn) {
        continueBtn.addEventListener('click', showCustomization);
    }
}

async function searchStations(query, suggestionsDiv, input, stationIndex) {
    console.log(`Searching stations for query: "${query}"`);
    
    try {
        const response = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`);
        
        if (!response.ok) {
            console.error('API response not ok:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (data.stations && data.stations.length > 0) {
            displaySuggestions(data.stations.slice(0, 8), suggestionsDiv, input, stationIndex);
        } else {
            suggestionsDiv.style.display = 'none';
            suggestionsDiv.innerHTML = '';
        }
    } catch (error) {
        console.error('Error searching stations:', error);
        suggestionsDiv.style.display = 'none';
        suggestionsDiv.innerHTML = '';
    }
}

function displaySuggestions(stations, suggestionsDiv, input, stationIndex) {
    console.log('Displaying suggestions:', stations.length);
    
    suggestionsDiv.innerHTML = '';
    
    stations.forEach(station => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = station.name;
        
        suggestionItem.addEventListener('click', function() {
            console.log(`Selected station: ${station.name} for input ${stationIndex}`);
            input.value = station.name;
            input.dataset.stationId = station.id;
            suggestionsDiv.style.display = 'none';
            checkAllStationsSelected();
        });
        
        suggestionsDiv.appendChild(suggestionItem);
    });
    
    suggestionsDiv.style.display = 'block';
}

function checkAllStationsSelected() {
    let allSelected = true;
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const input = document.getElementById(`station-${i}`);
        if (!input || !input.value.trim() || !input.dataset.stationId) {
            allSelected = false;
            break;
        }
    }
    
    const continueBtn = document.getElementById('continue-to-customization');
    if (continueBtn) {
        continueBtn.disabled = !allSelected;
    }
    
    console.log('All stations selected:', allSelected);
}

function showCustomization() {
    console.log('Showing customization phase');
    
    // Hide station selection
    document.getElementById('station-selection').classList.add('hidden');
    
    // Show customization
    const customization = document.getElementById('station-customization');
    customization.classList.remove('hidden');
    
    // Generate customization inputs
    generateCustomizationInputs();
}

function generateCustomizationInputs() {
    const container = document.querySelector('.customization-container');
    container.innerHTML = '';
    
    // Set grid columns
    if (selectedStationCount <= 2) {
        container.style.gridTemplateColumns = 'repeat(' + selectedStationCount + ', 1fr)';
    } else {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }
    
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
            
            const customGroup = document.createElement('div');
            customGroup.className = 'custom-input-group';
            
            customGroup.innerHTML = `
                <label for="custom-${i}">${translations[currentLanguage].station} ${i} Anzeigename:</label>
                <input type="text" 
                       id="custom-${i}" 
                       value="${input.value}"
                       placeholder="Eigener Anzeigename...">
            `;
            
            container.appendChild(customGroup);
        }
    }
    
    // Setup start button
    const startBtn = document.getElementById('apply-customization');
    if (startBtn) {
        startBtn.addEventListener('click', startDisplay);
    }
}

function startDisplay() {
    console.log('Starting display with stations:', selectedStations);
    
    // Update custom names
    for (let i = 0; i < selectedStations.length; i++) {
        const customInput = document.getElementById(`custom-${i + 1}`);
        if (customInput && customInput.value.trim()) {
            selectedStations[i].customName = customInput.value.trim();
        }
    }
    
    // Hide customization
    document.getElementById('station-customization').classList.add('hidden');
    
    // Show boards
    generateDynamicBoards();
    document.getElementById('dynamic-boards').classList.remove('hidden');
    document.getElementById('change-stations').classList.remove('hidden');
    
    // Start fetching data
    fetchAllDepartures();
    updateInterval = setInterval(fetchAllDepartures, 25000);
}

function generateDynamicBoards() {
    const boardsContainer = document.getElementById('dynamic-boards');
    boardsContainer.innerHTML = '';
    boardsContainer.className = `dynamic-boards stations-${selectedStationCount}`;
    
    selectedStations.forEach((station, index) => {
        const boardHtml = `
            <div class="board-container" id="board-${index}">
                <div class="station-header">
                    <h2>${station.customName}</h2>
                    <div class="last-updated" id="last-updated-${index}">
                        ${translations[currentLanguage].lastUpdate}: --:--
                    </div>
                </div>
                <div class="departure-board">
                    <div class="board-header">
                        <div class="header-line">${translations[currentLanguage].line}</div>
                        <div class="header-destination">${translations[currentLanguage].destination}</div>
                        <div class="header-platform">${translations[currentLanguage].platform}</div>
                        <div class="header-departure">${translations[currentLanguage].departure}</div>
                    </div>
                    <div class="departures-list" id="departures-${index}">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>${translations[currentLanguage].loading}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        boardsContainer.innerHTML += boardHtml;
    });
}

async function fetchAllDepartures() {
    console.log('Fetching departures for all stations...');
    
    for (let i = 0; i < selectedStations.length; i++) {
        await fetchDepartures(selectedStations[i], i);
    }
}

async function fetchDepartures(station, boardIndex) {
    try {
        const response = await fetch(`https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=10`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Departures for ${station.name}:`, data);
        
        displayDepartures(data.stationboard || [], boardIndex);
        updateLastUpdateTime(boardIndex);
        
    } catch (error) {
        console.error(`Error fetching departures for ${station.name}:`, error);
        displayError(boardIndex);
    }
}

function displayDepartures(departures, boardIndex) {
    const departuresContainer = document.getElementById(`departures-${boardIndex}`);
    
    if (!departures || departures.length === 0) {
        departuresContainer.innerHTML = `<div class="no-data">${translations[currentLanguage].noData}</div>`;
        return;
    }
    
    let html = '';
    
    departures.forEach(departure => {
        const line = departure.number || departure.name || 'N/A';
        const destination = departure.to || 'N/A';
        const platform = departure.stop?.platform || '-';
        
        // Calculate departure time
        let departureTime = 'N/A';
        let delayInfo = '';
        
        if (departure.stop?.departureTimestamp) {
            const depTime = new Date(departure.stop.departureTimestamp * 1000);
            const now = new Date();
            const diffMinutes = Math.floor((depTime - now) / (1000 * 60));
            
            if (diffMinutes <= 0) {
                departureTime = 'Jetzt';
            } else if (diffMinutes < 60) {
                departureTime = `${diffMinutes} min`;
            } else {
                departureTime = depTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
            }
            
            if (departure.stop?.delay && departure.stop.delay > 0) {
                delayInfo = `<span class="delay">+${departure.stop.delay / 60} min</span>`;
            }
        }
        
        // Determine transport type for styling
        let transportClass = '';
        if (departure.category) {
            const category = departure.category.toLowerCase();
            if (category.includes('tram') || category.includes('t')) {
                transportClass = 'tram';
            } else if (category.includes('bus') || category.includes('b')) {
                transportClass = 'bus';
            } else {
                transportClass = 'train';
            }
        }
        
        html += `
            <div class="departure-row">
                <div class="line-number ${transportClass}">${line}</div>
                <div class="destination">${destination}</div>
                <div class="platform">${platform}</div>
                <div class="departure-time">${departureTime} ${delayInfo}</div>
            </div>
        `;
    });
    
    departuresContainer.innerHTML = html;
}

function displayError(boardIndex) {
    const departuresContainer = document.getElementById(`departures-${boardIndex}`);
    departuresContainer.innerHTML = `<div class="no-data">Fehler beim Laden der Daten</div>`;
}

function updateLastUpdateTime(boardIndex) {
    const lastUpdatedElement = document.getElementById(`last-updated-${boardIndex}`);
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = `${translations[currentLanguage].lastUpdate}: ${now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
    }
}

function setupLanguageSelector() {
    const languageBtn = document.getElementById('language-selector');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    if (languageBtn && languageDropdown) {
        languageBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            languageDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            languageDropdown.classList.add('hidden');
        });
        
        languageOptions.forEach(option => {
            option.addEventListener('click', function() {
                const selectedLang = this.dataset.lang;
                if (selectedLang && selectedLang !== currentLanguage) {
                    currentLanguage = selectedLang;
                    updateLanguage();
                    languageBtn.textContent = selectedLang === 'de' ? '🌐 DE' : '🌐 EN';
                }
                languageDropdown.classList.add('hidden');
            });
        });
    }
    
    // Setup change stations button
    const changeStationsBtn = document.getElementById('change-stations');
    if (changeStationsBtn) {
        changeStationsBtn.addEventListener('click', function() {
            // Stop updates
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            
            // Reset state
            selectedStationCount = 0;
            selectedStations = [];
            
            // Hide all phases except station count selection
            document.getElementById('station-selection').classList.add('hidden');
            document.getElementById('station-customization').classList.add('hidden');
            document.getElementById('dynamic-boards').classList.add('hidden');
            document.getElementById('change-stations').classList.add('hidden');
            
            // Show station count selection
            document.getElementById('station-count-selection').classList.remove('hidden');
            
            // Remove selected state from buttons
            document.querySelectorAll('.station-count-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        });
    }
}

function updateLanguage() {
    // Update page title
    document.title = translations[currentLanguage].title;
    
    // Update main heading
    const mainHeading = document.querySelector('h1');
    if (mainHeading) {
        mainHeading.textContent = translations[currentLanguage].title;
    }
    
    // Update station count selection
    const stationCountTitle = document.querySelector('.station-count-selection h2');
    if (stationCountTitle) {
        stationCountTitle.textContent = translations[currentLanguage].howManyStations;
    }
    
    // Update customization section
    const customizationTitle = document.querySelector('.station-customization h2');
    if (customizationTitle) {
        customizationTitle.textContent = translations[currentLanguage].customizeStations;
    }
    
    const colorCustomizationTitle = document.querySelector('.color-customization h3');
    if (colorCustomizationTitle) {
        colorCustomizationTitle.textContent = translations[currentLanguage].customizeColors;
    }
    
    // Update color labels
    const tramColorLabel = document.querySelector('label[for="tram-color"]');
    if (tramColorLabel) {
        tramColorLabel.textContent = translations[currentLanguage].tramColor;
    }
    
    const busColorLabel = document.querySelector('label[for="bus-color"]');
    if (busColorLabel) {
        busColorLabel.textContent = translations[currentLanguage].busColor;
    }
    
    const trainColorLabel = document.querySelector('label[for="train-color"]');
    if (trainColorLabel) {
        trainColorLabel.textContent = translations[currentLanguage].trainColor;
    }
    
    // Update buttons
    const startBtn = document.getElementById('apply-customization');
    if (startBtn) {
        startBtn.textContent = translations[currentLanguage].startDisplay;
    }
    
    const changeStationsBtn = document.getElementById('change-stations');
    if (changeStationsBtn) {
        changeStationsBtn.textContent = translations[currentLanguage].changeStations;
    }
    
    // Update footer
    const footerText = document.querySelector('footer p');
    if (footerText) {
        footerText.textContent = translations[currentLanguage].dataSource;
    }
    
    // Update loading text
    const loadingText = document.querySelector('#loading p');
    if (loadingText) {
        loadingText.textContent = translations[currentLanguage].loading;
    }
}
