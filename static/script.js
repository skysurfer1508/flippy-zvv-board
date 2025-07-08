// ZVV Departure Board Script
let currentLanguage = 'de';
let selectedStationCount = 0;
let selectedStations = [];
let updateInterval;
let lineColors = {
    'tram': '#4ecdc4',
    'bus': '#ff6b6b',
    'train': '#ffd700'
};

// Translation dictionary
const translations = {
    de: {
        title: 'ZVV Abfahrtszeiten',
        stationCountQuestion: 'Wie viele Stationen möchten Sie anzeigen?',
        customizeStations: 'Stationen anpassen',
        lineColors: 'Linien-Farben anpassen',
        startDisplay: 'Anzeige starten',
        changeStations: 'Stationen ändern',
        loading: 'Lade Abfahrtszeiten...',
        dataSource: 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
        line: 'Linie',
        destination: 'Ziel',
        platform: 'Gleis',
        departure: 'Abfahrt',
        noData: 'Keine Abfahrten verfügbar',
        searchPlaceholder: 'Station eingeben...',
        tramColor: 'Tram-Farbe:',
        busColor: 'Bus-Farbe:',
        trainColor: 'Zug-Farbe:',
        colorFor: 'Farbe für Linie',
        apply: 'Übernehmen',
        cancel: 'Abbrechen',
        lastUpdated: 'Zuletzt aktualisiert:'
    },
    en: {
        title: 'ZVV Departure Times',
        stationCountQuestion: 'How many stations would you like to display?',
        customizeStations: 'Customize Stations',
        lineColors: 'Customize Line Colors',
        startDisplay: 'Start Display',
        changeStations: 'Change Stations',
        loading: 'Loading departure times...',
        dataSource: 'Data from transport.opendata.ch | Updates every 25 seconds',
        line: 'Line',
        destination: 'Destination',
        platform: 'Platform',
        departure: 'Departure',
        noData: 'No departures available',
        searchPlaceholder: 'Enter station...',
        tramColor: 'Tram Color:',
        busColor: 'Bus Color:',
        trainColor: 'Train Color:',
        colorFor: 'Color for Line',
        apply: 'Apply',
        cancel: 'Cancel',
        lastUpdated: 'Last updated:'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupLanguageSelector();
});

function initializeApp() {
    setupStationCountSelection();
    setupColorModal();
    setupChangeStationsButton();
}

function setupStationCountSelection() {
    const stationCountButtons = document.querySelectorAll('.station-count-btn');
    
    stationCountButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            stationCountButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            selectedStationCount = parseInt(this.dataset.count);
            console.log('Selected station count:', selectedStationCount);
            
            // Show station selection after short delay
            setTimeout(() => {
                showStationSelection();
            }, 300);
        });
    });
}

function showStationSelection() {
    // Hide station count selection
    document.getElementById('station-count-selection').classList.add('hidden');
    
    // Show station selection
    const stationSelection = document.getElementById('station-selection');
    stationSelection.classList.remove('hidden');
    
    // Generate input fields
    generateStationInputs();
}

function generateStationInputs() {
    const container = document.querySelector('.dynamic-input-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        
        inputGroup.innerHTML = `
            <label for="station-${i}">${translations[currentLanguage].searchPlaceholder.replace('...', '')} ${i}:</label>
            <div class="search-container">
                <input type="text" id="station-${i}" placeholder="${translations[currentLanguage].searchPlaceholder}" autocomplete="off">
                <div class="suggestions" id="suggestions-${i}"></div>
            </div>
        `;
        
        container.appendChild(inputGroup);
    }
    
    // Add continue button
    const continueButton = document.createElement('button');
    continueButton.className = 'start-btn';
    continueButton.textContent = 'Weiter';
    continueButton.disabled = true;
    continueButton.onclick = showCustomization;
    
    container.appendChild(continueButton);
    
    // Setup search functionality for all inputs
    setupStationSearch();
}

function setupStationSearch() {
    const inputs = document.querySelectorAll('[id^="station-"]');
    
    inputs.forEach((input, index) => {
        const stationIndex = index + 1;
        const suggestionsDiv = document.getElementById(`suggestions-${stationIndex}`);
        
        input.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (query.length >= 2) {
                searchStations(query, suggestionsDiv, input, stationIndex);
            } else {
                suggestionsDiv.style.display = 'none';
            }
            
            checkAllStationsSelected();
        });
        
        input.addEventListener('focus', function() {
            if (this.value.length >= 2) {
                const query = this.value.trim();
                searchStations(query, suggestionsDiv, input, stationIndex);
            }
        });
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    });
}

async function searchStations(query, suggestionsDiv, input, stationIndex) {
    try {
        console.log('Searching for:', query);
        
        const response = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&limit=10`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        suggestionsDiv.innerHTML = '';
        
        if (data.stations && data.stations.length > 0) {
            data.stations.forEach(station => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.textContent = station.name;
                
                suggestionItem.addEventListener('click', function() {
                    input.value = station.name;
                    input.dataset.stationId = station.id;
                    suggestionsDiv.style.display = 'none';
                    checkAllStationsSelected();
                });
                
                suggestionsDiv.appendChild(suggestionItem);
            });
            
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Error searching stations:', error);
        suggestionsDiv.style.display = 'none';
    }
}

function checkAllStationsSelected() {
    const inputs = document.querySelectorAll('[id^="station-"]');
    const continueButton = document.querySelector('.start-btn');
    
    let allSelected = true;
    selectedStations = [];
    
    inputs.forEach(input => {
        if (!input.value.trim() || !input.dataset.stationId) {
            allSelected = false;
        } else {
            selectedStations.push({
                name: input.value,
                id: input.dataset.stationId
            });
        }
    });
    
    continueButton.disabled = !allSelected;
}

function showCustomization() {
    document.getElementById('station-selection').classList.add('hidden');
    document.getElementById('station-customization').classList.remove('hidden');
    
    generateCustomizationInputs();
}

function generateCustomizationInputs() {
    const container = document.querySelector('.customization-container');
    container.innerHTML = '';
    
    selectedStations.forEach((station, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-input-group';
        
        inputGroup.innerHTML = `
            <label for="custom-station-${index + 1}">Station ${index + 1} Anzeigename:</label>
            <input type="text" id="custom-station-${index + 1}" value="${station.name}">
        `;
        
        container.appendChild(inputGroup);
    });
}

function setupColorModal() {
    const modal = document.getElementById('color-picker-modal');
    const applyBtn = document.getElementById('color-modal-apply');
    const cancelBtn = document.getElementById('color-modal-cancel');
    
    applyBtn.addEventListener('click', applyColorChange);
    cancelBtn.addEventListener('click', closeColorModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeColorModal();
        }
    });
}

function applyColorChange() {
    // Implementation for color changes
    closeColorModal();
}

function closeColorModal() {
    document.getElementById('color-picker-modal').classList.add('hidden');
}

function setupChangeStationsButton() {
    const changeBtn = document.getElementById('change-stations');
    changeBtn.addEventListener('click', function() {
        // Clear existing data
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // Reset to station count selection
        document.getElementById('dynamic-boards').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-count-selection').classList.remove('hidden');
        changeBtn.classList.add('hidden');
        
        // Reset selections
        selectedStationCount = 0;
        selectedStations = [];
        
        // Remove selected class from all buttons
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    });
}

document.getElementById('apply-customization').addEventListener('click', function() {
    // Get custom names
    const customInputs = document.querySelectorAll('[id^="custom-station-"]');
    customInputs.forEach((input, index) => {
        if (selectedStations[index]) {
            selectedStations[index].customName = input.value || selectedStations[index].name;
        }
    });
    
    // Get custom colors
    lineColors.tram = document.getElementById('tram-color').value;    
    lineColors.bus = document.getElementById('bus-color').value;
    lineColors.train = document.getElementById('train-color').value;
    
    startDepartureDisplay();
});

function startDepartureDisplay() {
    // Hide customization
    document.getElementById('station-customization').classList.add('hidden');
    
    // Show loading
    document.getElementById('loading').classList.remove('hidden');
    
    // Generate boards
    generateDepartureBoards();
    
    // Start fetching data
    fetchAllDepartures();
    
    // Set up automatic updates
    updateInterval = setInterval(fetchAllDepartures, 25000);
    
    // Show change stations button
    document.getElementById('change-stations').classList.remove('hidden');
}

function generateDepartureBoards() {
    const boardsContainer = document.getElementById('dynamic-boards');
    boardsContainer.innerHTML = '';
    boardsContainer.className = `dynamic-boards stations-${selectedStationCount}`;
    
    selectedStations.forEach((station, index) => {
        const boardHTML = `
            <div class="board-container" id="board-${index}">
                <div class="station-header">
                    <h2>${station.customName || station.name}</h2>
                    <div class="last-updated" id="last-updated-${index}">
                        ${translations[currentLanguage].lastUpdated} --:--
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
                        <div class="no-data">${translations[currentLanguage].loading}</div>
                    </div>
                </div>
            </div>
        `;
        
        boardsContainer.innerHTML += boardHTML;
    });
}

async function fetchAllDepartures() {
    for (let i = 0; i < selectedStations.length; i++) {
        await fetchDepartures(selectedStations[i], i);
    }
    
    // Hide loading after first fetch
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dynamic-boards').classList.remove('hidden');
}

async function fetchDepartures(station, boardIndex) {
    try {
        console.log(`Fetching departures for ${station.name}`);
        
        const response = await fetch(`https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=20`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Departures for ${station.name}:`, data);
        
        displayDepartures(data.stationboard || [], boardIndex);
        updateLastUpdatedTime(boardIndex);
        
    } catch (error) {
        console.error(`Error fetching departures for ${station.name}:`, error);
        displayError(boardIndex);
    }
}

function displayDepartures(departures, boardIndex) {
    const departuresList = document.getElementById(`departures-${boardIndex}`);
    
    if (!departures || departures.length === 0) {
        departuresList.innerHTML = `<div class="no-data">${translations[currentLanguage].noData}</div>`;
        return;
    }
    
    let html = '';
    
    departures.slice(0, 15).forEach(departure => {
        const departureTime = new Date(departure.stop.departure);
        const now = new Date();
        const minutesUntil = Math.round((departureTime - now) / (1000 * 60));
        
        // Calculate delay properly - round to nearest minute
        let delayMinutes = 0;
        if (departure.stop.delay) {
            delayMinutes = Math.round(departure.stop.delay / 60);
        }
        
        const timeDisplay = minutesUntil <= 0 ? 'Jetzt' : `${minutesUntil}'`;
        const delayDisplay = delayMinutes > 0 ? `+${delayMinutes}'` : '';
        
        const transportType = getTransportType(departure.category);
        const lineColor = getLineColor(transportType);
        
        html += `
            <div class="departure-row">
                <div class="line-number ${transportType}" style="background-color: ${lineColor}; color: ${getContrastColor(lineColor)};">
                    ${departure.number || departure.name}
                </div>
                <div class="destination" title="${departure.to}">
                    ${departure.to}
                </div>
                <div class="platform">
                    ${departure.stop.platform || '-'}
                </div>
                <div class="departure-time">
                    ${timeDisplay}
                    ${delayDisplay ? `<span class="delay">${delayDisplay}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    departuresList.innerHTML = html;
}

function getTransportType(category) {
    if (!category) return 'train';
    
    const cat = category.toLowerCase();
    if (cat.includes('tram') || cat.includes('t')) return 'tram';
    if (cat.includes('bus') || cat.includes('b')) return 'bus';
    return 'train';
}

function getLineColor(transportType) {
    return lineColors[transportType] || lineColors.train;
}

function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

function displayError(boardIndex) {
    const departuresList = document.getElementById(`departures-${boardIndex}`);
    departuresList.innerHTML = `<div class="no-data">Fehler beim Laden der Daten</div>`;
}

function updateLastUpdatedTime(boardIndex) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const lastUpdatedElement = document.getElementById(`last-updated-${boardIndex}`);
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `${translations[currentLanguage].lastUpdated} ${timeString}`;
    }
}

function setupLanguageSelector() {
    const languageBtn = document.getElementById('language-selector');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    languageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        languageDropdown.classList.toggle('hidden');
    });
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const newLanguage = this.dataset.lang;
            if (newLanguage !== currentLanguage) {
                changeLanguage(newLanguage);
            }
            languageDropdown.classList.add('hidden');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        languageDropdown.classList.add('hidden');
    });
}

function changeLanguage(newLanguage) {
    currentLanguage = newLanguage;
    
    // Update language button
    const languageBtn = document.getElementById('language-selector');
    languageBtn.textContent = newLanguage === 'de' ? '🌐 DE' : '🌐 EN';
    
    // Update all text content
    updateLanguageContent();
}

function updateLanguageContent() {
    // Update title
    document.querySelector('h1').textContent = translations[currentLanguage].title;
    
    // Update station count question
    const stationCountH2 = document.querySelector('.station-count-selection h2');
    if (stationCountH2) {
        stationCountH2.textContent = translations[currentLanguage].stationCountQuestion;
    }
    
    // Update customization texts
    const customizationH2 = document.querySelector('.station-customization h2');
    if (customizationH2) {
        customizationH2.textContent = translations[currentLanguage].customizeStations;
    }
    
    const colorH3 = document.querySelector('.color-customization h3');
    if (colorH3) {
        colorH3.textContent = translations[currentLanguage].lineColors;
    }
    
    // Update buttons
    const applyBtn = document.getElementById('apply-customization');
    if (applyBtn) {
        applyBtn.textContent = translations[currentLanguage].startDisplay;
    }
    
    const changeBtn = document.getElementById('change-stations');
    if (changeBtn) {
        changeBtn.textContent = translations[currentLanguage].changeStations;
    }
    
    // Update footer
    const footer = document.querySelector('footer p');
    if (footer) {
        footer.textContent = translations[currentLanguage].dataSource;
    }
    
    // Update loading text
    const loading = document.querySelector('.loading p');
    if (loading) {
        loading.textContent = translations[currentLanguage].loading;
    }
    
    // Update color labels
    const tramLabel = document.querySelector('label[for="tram-color"]');
    if (tramLabel) {
        tramLabel.textContent = translations[currentLanguage].tramColor;
    }
    
    const busLabel = document.querySelector('label[for="bus-color"]');
    if (busLabel) {
        busLabel.textContent = translations[currentLanguage].busColor;
    }
    
    const trainLabel = document.querySelector('label[for="train-color"]');
    if (trainLabel) {
        trainLabel.textContent = translations[currentLanguage].trainColor;
    }
    
    // Update input placeholders
    const stationInputs = document.querySelectorAll('[id^="station-"]');
    stationInputs.forEach(input => {
        input.placeholder = translations[currentLanguage].searchPlaceholder;
    });
    
    // Update board headers if they exist
    updateBoardHeaders();
}

function updateBoardHeaders() {
    const headerLines = document.querySelectorAll('.header-line');
    const headerDestinations = document.querySelectorAll('.header-destination');
    const headerPlatforms = document.querySelectorAll('.header-platform');
    const headerDepartures = document.querySelectorAll('.header-departure');
    
    headerLines.forEach(el => el.textContent = translations[currentLanguage].line);
    headerDestinations.forEach(el => el.textContent = translations[currentLanguage].destination);
    headerPlatforms.forEach(el => el.textContent = translations[currentLanguage].platform);
    headerDepartures.forEach(el => el.textContent = translations[currentLanguage].departure);
}

function formatDelay(delay) {
    if (!delay || delay === 0) return '';
    
    // Convert delay to minutes and round to whole number
    const delayMinutes = Math.round(delay / 60);
    
    if (delayMinutes === 0) return '';
    return delayMinutes > 0 ? `+${delayMinutes}` : `${delayMinutes}`;
}

function updateDepartureBoard(stationName, data, customName) {
    const board = document.querySelector(`[data-station="${stationName}"] .departures-list`);
    if (!board) return;

    if (!data || !data.stationboard || data.stationboard.length === 0) {
        board.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
        return;
    }

    const now = new Date();
    const departures = data.stationboard
        .filter(dep => new Date(dep.stop.departure) > now)
        .slice(0, 20);

    board.innerHTML = departures.map(dep => {
        const depTime = new Date(dep.stop.departure);
        const scheduledTime = new Date(dep.stop.prognosis?.departure || dep.stop.departure);
        const delay = dep.stop.delay || 0;
        
        // Format delay properly
        const delayText = formatDelay(delay);
        
        const minutes = Math.max(0, Math.floor((depTime - now) / 60000));
        const timeStr = minutes === 0 ? 'Jetzt' : minutes < 60 ? `${minutes}'` : 
                       depTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

        const lineClass = dep.category?.toLowerCase() === 'bus' ? 'bus' : 
                         dep.category?.toLowerCase() === 'tram' ? 'tram' : '';

        return `
            <div class="departure-row">
                <div class="line-number ${lineClass}">${dep.number || dep.name}</div>
                <div class="destination">${dep.to}</div>
                <div class="platform">${dep.stop.platform || ''}</div>
                <div class="departure-time">
                    ${timeStr}
                    ${delayText ? `<span class="delay">${delayText}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}
