
// ZVV Dual Departure Board - Enhanced JavaScript with proper station workflow

let currentStationCount = 0;
let selectedStations = [];
let customNames = [];
let updateInterval;
let lineColors = JSON.parse(localStorage.getItem('zvv-line-colors')) || {
    'tram': '#4ecdc4',
    'bus': '#ff6b6b',
    'train': '#ffd700'
};

// Translation system
const translations = {
    de: {
        title: "ZVV Doppel-Abfahrtszeiten",
        selectStationCount: "Anzahl Stationen wählen",
        selectStations: "Stationen auswählen",
        startMonitoring: "Abfahrtszeiten anzeigen",
        loading: "Lade Abfahrtszeiten...",
        dataSource: "Daten von transport.opendata.ch",
        updateInterval: "Aktualisierung alle 25 Sekunden",
        changeStations: "Stationen ändern",
        language: "Sprache",
        changeLineColor: "Linienfarbe ändern",
        lineLabel: "Linie:",
        apply: "Anwenden",
        cancel: "Abbrechen",
        stationPlaceholder: "Station eingeben...",
        customizeName: "Anzeigename anpassen"
    },
    en: {
        title: "ZVV Dual Departure Times",
        selectStationCount: "Select Number of Stations",
        selectStations: "Select Stations",
        startMonitoring: "Show Departure Times",
        loading: "Loading departure times...",
        dataSource: "Data from transport.opendata.ch",
        updateInterval: "Updates every 25 seconds",
        changeStations: "Change Stations",
        language: "Language",
        changeLineColor: "Change Line Color",
        lineLabel: "Line:",
        apply: "Apply",
        cancel: "Cancel",
        stationPlaceholder: "Enter station...",
        customizeName: "Customize Display Name"
    }
};

let currentLanguage = localStorage.getItem('zvv-language') || 'de';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application');
    initializeApp();
    setupEventListeners();
    updateTranslations();
    
    // Check if we should restore from session storage
    const savedCount = sessionStorage.getItem('stationCount');
    const savedStations = sessionStorage.getItem('selectedStations');
    
    if (savedCount && savedStations) {
        console.log('Restoring from session storage');
        restoreFromSession();
    }
});

function initializeApp() {
    console.log('Initializing app');
    // Reset to initial state
    showSection('station-count-selection');
}

function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Station count buttons
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const count = parseInt(this.dataset.count);
            console.log('Station count selected:', count);
            selectStationCount(count);
        });
    });

    // Start monitoring button
    const startBtn = document.getElementById('start-monitoring');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            console.log('Start monitoring clicked');
            if (validateAllStations()) {
                showCustomizationPhase();
            }
        });
    }

    // Apply customization button
    const applyBtn = document.getElementById('apply-customization');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            console.log('Apply customization clicked');
            applyCustomization();
        });
    }

    // Change stations button
    const changeBtn = document.getElementById('change-stations');
    if (changeBtn) {
        changeBtn.addEventListener('click', function() {
            console.log('Change stations clicked');
            resetToStationSelection();
        });
    }

    // Language selector
    setupLanguageSelector();

    // Color picker events
    setupColorPicker();
}

function selectStationCount(count) {
    console.log('Selecting station count:', count);
    currentStationCount = count;
    sessionStorage.setItem('stationCount', count);
    
    // Update button states
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-count="${count}"]`).classList.add('active');
    
    // Generate station input fields
    generateStationInputs(count);
    
    // Show station selection phase
    showSection('station-selection');
}

function generateStationInputs(count) {
    console.log('Generating station inputs for count:', count);
    const container = document.getElementById('station-inputs-container');
    if (!container) {
        console.error('Station inputs container not found');
        return;
    }
    
    // Clear existing inputs
    container.innerHTML = '';
    
    // Generate input fields
    for (let i = 0; i < count; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        
        const label = document.createElement('label');
        label.textContent = `Station ${i + 1}:`;
        label.className = 'station-label';
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'station-input';
        input.placeholder = translations[currentLanguage].stationPlaceholder;
        input.dataset.index = i;
        
        // Create suggestions dropdown
        const suggestions = document.createElement('div');
        suggestions.className = 'suggestions';
        suggestions.id = `suggestions-${i}`;
        
        searchContainer.appendChild(input);
        searchContainer.appendChild(suggestions);
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(searchContainer);
        container.appendChild(inputGroup);
        
        // Setup autocomplete for this input
        setupAutocomplete(input, suggestions);
    }
    
    console.log('Generated', count, 'station input fields');
}

function setupAutocomplete(input, suggestionsDiv) {
    let debounceTimeout;
    let selectedIndex = -1;
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(debounceTimeout);
        
        if (query.length < 2) {
            hideSuggestions(suggestionsDiv);
            return;
        }
        
        // Debounce API calls
        debounceTimeout = setTimeout(() => {
            fetchStationSuggestions(query, suggestionsDiv, input);
        }, 300);
    });
    
    input.addEventListener('keydown', function(e) {
        const suggestions = suggestionsDiv.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                selectSuggestion(suggestions[selectedIndex], input, suggestionsDiv);
            }
        } else if (e.key === 'Escape') {
            hideSuggestions(suggestionsDiv);
        }
    });
    
    input.addEventListener('blur', function() {
        // Delay hiding to allow click on suggestions
        setTimeout(() => {
            hideSuggestions(suggestionsDiv);
        }, 200);
    });
    
    input.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            fetchStationSuggestions(this.value, suggestionsDiv, input);
        }
    });
}

async function fetchStationSuggestions(query, suggestionsDiv, input) {
    try {
        console.log('Fetching suggestions for:', query);
        const response = await fetch(`/v1/locations?query=${encodeURIComponent(query)}&type=station`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (data.stations && data.stations.length > 0) {
            displaySuggestions(data.stations, suggestionsDiv, input);
        } else {
            hideSuggestions(suggestionsDiv);
        }
    } catch (error) {
        console.error('Error fetching station suggestions:', error);
        hideSuggestions(suggestionsDiv);
    }
}

function displaySuggestions(stations, suggestionsDiv, input) {
    console.log('Displaying suggestions:', stations.length, 'stations');
    suggestionsDiv.innerHTML = '';
    
    stations.slice(0, 8).forEach((station, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = station.name;
        suggestionItem.dataset.stationId = station.id;
        suggestionItem.dataset.stationName = station.name;
        
        suggestionItem.addEventListener('click', function() {
            selectSuggestion(this, input, suggestionsDiv);
        });
        
        suggestionsDiv.appendChild(suggestionItem);
    });
    
    suggestionsDiv.style.display = 'block';
}

function selectSuggestion(suggestionItem, input, suggestionsDiv) {
    const stationName = suggestionItem.dataset.stationName;
    const stationId = suggestionItem.dataset.stationId;
    
    console.log('Selected station:', stationName, 'ID:', stationId);
    
    input.value = stationName;
    input.dataset.stationId = stationId;
    input.classList.remove('error');
    
    hideSuggestions(suggestionsDiv);
    
    // Check if all stations are filled
    checkAllStationsFilled();
}

function hideSuggestions(suggestionsDiv) {
    suggestionsDiv.style.display = 'none';
    suggestionsDiv.innerHTML = '';
}

function updateSuggestionSelection(suggestions, selectedIndex) {
    suggestions.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
    });
}

function checkAllStationsFilled() {
    const inputs = document.querySelectorAll('.station-input');
    const startBtn = document.getElementById('start-monitoring');
    
    let allFilled = true;
    inputs.forEach(input => {
        if (!input.value.trim() || !input.dataset.stationId) {
            allFilled = false;
        }
    });
    
    if (startBtn) {
        startBtn.disabled = !allFilled;
        if (allFilled) {
            startBtn.classList.add('active');
        } else {
            startBtn.classList.remove('active');
        }
    }
    
    console.log('All stations filled:', allFilled);
    return allFilled;
}

function validateAllStations() {
    const inputs = document.querySelectorAll('.station-input');
    selectedStations = [];
    
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim() || !input.dataset.stationId) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
            selectedStations.push({
                id: input.dataset.stationId,
                name: input.value.trim()
            });
        }
    });
    
    if (isValid) {
        sessionStorage.setItem('selectedStations', JSON.stringify(selectedStations));
        console.log('Selected stations saved:', selectedStations);
    }
    
    return isValid;
}

function showCustomizationPhase() {
    console.log('Showing customization phase');
    
    // Update customization form
    const container = document.querySelector('.customization-container');
    if (!container) {
        console.error('Customization container not found');
        return;
    }
    
    container.innerHTML = '';
    
    selectedStations.forEach((station, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-input-group';
        
        const label = document.createElement('label');
        label.textContent = `Anzeigename für ${station.name}:`;
        label.setAttribute('for', `custom-name-${index}`);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `custom-name-${index}`;
        input.className = 'custom-name-input';
        input.value = station.name;
        input.placeholder = station.name;
        input.dataset.index = index;
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        container.appendChild(inputGroup);
    });
    
    showSection('station-customization');
}

function applyCustomization() {
    console.log('Applying customization');
    
    // Get custom names
    customNames = [];
    const nameInputs = document.querySelectorAll('.custom-name-input');
    nameInputs.forEach(input => {
        customNames.push(input.value.trim() || selectedStations[input.dataset.index].name);
    });
    
    // Get color customizations
    const tramColor = document.getElementById('tram-color').value;
    const busColor = document.getElementById('bus-color').value;
    const trainColor = document.getElementById('train-color').value;
    
    lineColors = {
        'tram': tramColor,
        'bus': busColor,
        'train': trainColor
    };
    
    localStorage.setItem('zvv-line-colors', JSON.stringify(lineColors));
    
    console.log('Custom names:', customNames);
    console.log('Line colors:', lineColors);
    
    // Save to session storage
    sessionStorage.setItem('customNames', JSON.stringify(customNames));
    
    // Start monitoring
    startDepartureMonitoring();
}

function startDepartureMonitoring() {
    console.log('Starting departure monitoring');
    
    // Hide all setup sections
    hideAllSections();
    
    // Show dual boards
    const dualBoards = document.getElementById('dual-boards');
    const changeBtn = document.getElementById('change-stations');
    
    if (dualBoards) {
        dualBoards.classList.remove('hidden');
        dualBoards.className = `dual-boards stations-${currentStationCount}`;
    }
    
    if (changeBtn) {
        changeBtn.classList.remove('hidden');
    }
    
    // Generate board HTML
    generateDualBoards();
    
    // Start fetching data
    fetchAllDepartureData();
    
    // Set up periodic updates
    updateInterval = setInterval(fetchAllDepartureData, 25000);
}

function generateDualBoards() {
    const dualBoards = document.getElementById('dual-boards');
    if (!dualBoards) return;
    
    dualBoards.innerHTML = '';
    
    selectedStations.forEach((station, index) => {
        const displayName = customNames[index] || station.name;
        
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        boardContainer.innerHTML = `
            <div class="station-header">
                <h2>${displayName}</h2>
                <div class="last-updated" id="updated-${index}">Wird geladen...</div>
            </div>
            <div class="departure-board">
                <div class="board-header">
                    <div>Linie</div>
                    <div>Richtung</div>
                    <div>Gleis</div>
                    <div>Abfahrt</div>
                </div>
                <div class="departures-list" id="departures-${index}">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Lade Abfahrtszeiten...</p>
                    </div>
                </div>
            </div>
        `;
        
        dualBoards.appendChild(boardContainer);
    });
}

async function fetchAllDepartureData() {
    console.log('Fetching departure data for all stations');
    
    const promises = selectedStations.map((station, index) => 
        fetchDepartureData(station.id, index)
    );
    
    try {
        await Promise.all(promises);
    } catch (error) {
        console.error('Error fetching departure data:', error);
    }
}

async function fetchDepartureData(stationId, boardIndex) {
    try {
        const response = await fetch(`/v1/stationboard?station=${encodeURIComponent(stationId)}&limit=15`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Departure data for station ${stationId}:`, data);
        
        displayDepartureData(data, boardIndex);
        updateLastUpdatedTime(boardIndex);
        
    } catch (error) {
        console.error(`Error fetching data for station ${stationId}:`, error);
        displayErrorMessage(boardIndex);
    }
}

function displayDepartureData(data, boardIndex) {
    const departuresList = document.getElementById(`departures-${boardIndex}`);
    if (!departuresList) return;
    
    if (!data.stationboard || data.stationboard.length === 0) {
        departuresList.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
        return;
    }
    
    let html = '';
    data.stationboard.forEach(departure => {
        const lineNumber = departure.number || departure.name || '?';
        const destination = departure.to || 'Unbekannt';
        const platform = departure.stop?.platform || '-';
        
        // Calculate departure time
        const departureTime = calculateDepartureTime(departure.stop?.departure);
        const delay = departure.stop?.delay || 0;
        
        // Determine line type and color
        const lineType = getLineType(departure.category);
        const lineColor = lineColors[lineType] || lineColors.train;
        
        html += `
            <div class="departure-row">
                <div class="line-number ${lineType}" style="background-color: ${lineColor}" 
                     onclick="openColorPicker('${lineNumber}', '${lineColor}')" 
                     tabindex="0" role="button" aria-label="Farbe für Linie ${lineNumber} ändern">
                    ${lineNumber}
                </div>
                <div class="destination">${destination}</div>
                <div class="platform">${platform}</div>
                <div class="departure-time">
                    ${departureTime}
                    ${delay > 0 ? `<span class="delay">+${delay}'</span>` : ''}
                </div>
            </div>
        `;
    });
    
    departuresList.innerHTML = html;
}

function calculateDepartureTime(departureString) {
    if (!departureString) return '--:--';
    
    try {
        const departureDate = new Date(departureString);
        const now = new Date();
        const diffMinutes = Math.round((departureDate - now) / 60000);
        
        if (diffMinutes <= 0) {
            return 'Jetzt';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}'`;
        } else {
            return departureDate.toLocaleTimeString('de-CH', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    } catch (error) {
        console.error('Error calculating departure time:', error);
        return '--:--';
    }
}

function getLineType(category) {
    if (!category) return 'train';
    
    const cat = category.toLowerCase();
    if (cat.includes('tram') || cat.includes('t')) return 'tram';
    if (cat.includes('bus') || cat.includes('b')) return 'bus';
    return 'train';
}

function updateLastUpdatedTime(boardIndex) {
    const updatedElement = document.getElementById(`updated-${boardIndex}`);
    if (updatedElement) {
        const now = new Date();
        updatedElement.textContent = `Aktualisiert: ${now.toLocaleTimeString('de-CH')}`;
    }
}

function displayErrorMessage(boardIndex) {
    const departuresList = document.getElementById(`departures-${boardIndex}`);
    if (departuresList) {
        departuresList.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
    }
}

// Utility functions
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
    }
}

function hideAllSections() {
    const sections = [
        'station-count-selection',
        'station-selection', 
        'station-customization',
        'dual-boards',
        'loading'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('hidden');
        }
    });
}

function resetToStationSelection() {
    console.log('Resetting to station selection');
    
    // Clear intervals
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    // Clear session storage
    sessionStorage.removeItem('stationCount');
    sessionStorage.removeItem('selectedStations');
    sessionStorage.removeItem('customNames');
    
    // Reset variables
    currentStationCount = 0;
    selectedStations = [];
    customNames = [];
    
    // Hide change button
    const changeBtn = document.getElementById('change-stations');
    if (changeBtn) {
        changeBtn.classList.add('hidden');
    }
    
    // Reset button states
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show initial section
    showSection('station-count-selection');
}

function restoreFromSession() {
    console.log('Restoring from session storage');
    
    const savedCount = parseInt(sessionStorage.getItem('stationCount'));
    const savedStations = JSON.parse(sessionStorage.getItem('selectedStations'));
    const savedNames = JSON.parse(sessionStorage.getItem('customNames'));
    
    if (savedCount && savedStations) {
        currentStationCount = savedCount;
        selectedStations = savedStations;
        customNames = savedNames || savedStations.map(s => s.name);
        
        console.log('Restored:', { currentStationCount, selectedStations, customNames });
        
        // Start monitoring directly
        startDepartureMonitoring();
    }
}

// Language functions
function setupLanguageSelector() {
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    
    if (languageBtn && languageDropdown) {
        languageBtn.addEventListener('click', function() {
            languageDropdown.classList.toggle('hidden');
        });
        
        document.addEventListener('click', function(e) {
            if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.add('hidden');
            }
        });
        
        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', function() {
                const lang = this.dataset.lang;
                changeLanguage(lang);
                languageDropdown.classList.add('hidden');
            });
        });
    }
}

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('zvv-language', lang);
    updateTranslations();
    console.log('Language changed to:', lang);
}

function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
    
    // Update placeholders
    document.querySelectorAll('.station-input').forEach(input => {
        input.placeholder = translations[currentLanguage].stationPlaceholder;
    });
}

// Color picker functions
function setupColorPicker() {
    const modal = document.getElementById('color-picker-modal');
    const applyBtn = document.getElementById('apply-color');
    const cancelBtn = document.getElementById('cancel-color');
    const colorPicker = document.getElementById('color-picker');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyLineColor);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeColorPicker);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeColorPicker();
            }
        });
    }
}

function openColorPicker(lineId, currentColor) {
    const modal = document.getElementById('color-picker-modal');
    const selectedLineSpan = document.getElementById('selected-line-id');
    const colorPicker = document.getElementById('color-picker');
    
    if (modal && selectedLineSpan && colorPicker) {
        selectedLineSpan.textContent = lineId;
        colorPicker.value = currentColor;
        modal.classList.remove('hidden');
        modal.dataset.lineId = lineId;
    }
}

function applyLineColor() {
    const modal = document.getElementById('color-picker-modal');
    const colorPicker = document.getElementById('color-picker');
    const lineId = modal.dataset.lineId;
    const newColor = colorPicker.value;
    
    // Update all line elements with this line number
    document.querySelectorAll('.line-number').forEach(element => {
        if (element.textContent.trim() === lineId) {
            element.style.backgroundColor = newColor;
        }
    });
    
    console.log(`Line ${lineId} color changed to ${newColor}`);
    closeColorPicker();
}

function closeColorPicker() {
    const modal = document.getElementById('color-picker-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('color-picker-modal');
        const languageDropdown = document.getElementById('language-dropdown');
        
        if (modal && !modal.classList.contains('hidden')) {
            closeColorPicker();
        }
        
        if (languageDropdown && !languageDropdown.classList.contains('hidden')) {
            languageDropdown.classList.add('hidden');
        }
    }
});

// Export functions for debugging
window.zvvDebug = {
    currentStationCount,
    selectedStations,
    customNames,
    resetToStationSelection,
    restoreFromSession
};

console.log('ZVV Dual Departure Board JavaScript loaded');
