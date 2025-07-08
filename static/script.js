// Global variables
let selectedLineId = null;
let currentLanguage = 'de';

// API functions
async function fetchDepartures(stationId) {
    const url = `/v1/departures/${stationId}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.departures || [];
    } catch (error) {
        console.error('Fetching departures failed:', error);
        return [];
    }
}

// Function to update the departure board
function updateBoard(stationId, containerId, stationName) {
    const boardContainer = document.getElementById(containerId);
    if (!boardContainer) {
        console.error(`Board container not found: ${containerId}`);
        return;
    }

    const departuresList = boardContainer.querySelector('.departures-list');
    const lastUpdatedElement = boardContainer.querySelector('.last-updated');

    if (!departuresList) {
        console.error('Departures list not found in container:', containerId);
        return;
    }

    // Show loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
    }

    fetchDepartures(stationId)
        .then(departures => {
            // Hide loading indicator
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }

            departuresList.innerHTML = ''; // Clear existing departures

            if (departures && departures.length > 0) {
                departures.forEach(departure => {
                    const row = document.createElement('div');
                    row.className = 'departure-row';

                    const lineNumber = document.createElement('div');
                    lineNumber.className = `line-number ${departure.line.category}`;
                    lineNumber.textContent = departure.line.number;
                    lineNumber.tabIndex = 0;
                    lineNumber.role = 'button';
                    lineNumber.setAttribute('aria-label', `Farbe für Linie ${departure.line.id} ändern`);
                    lineNumber.setAttribute('data-line-id', departure.line.id);
                    
                    // Apply saved color if exists
                    const savedColor = localStorage.getItem(`lineColor_${departure.line.id}`);
                    if (savedColor) {
                        lineNumber.style.backgroundColor = savedColor;
                    }
                    
                    lineNumber.addEventListener('click', () => openColorPicker(departure.line.id));
                    lineNumber.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            openColorPicker(departure.line.id);
                        }
                    });
                    row.appendChild(lineNumber);

                    const destination = document.createElement('div');
                    destination.className = 'destination';
                    destination.textContent = departure.direction;
                    row.appendChild(destination);

                    const platform = document.createElement('div');
                    platform.className = 'platform';
                    platform.textContent = departure.platform;
                    row.appendChild(platform);

                    const departureTime = document.createElement('div');
                    departureTime.className = 'departure-time';
                    const time = formatTime(departure.stop.departure.time);
                    departureTime.textContent = time;

                    if (departure.stop.departure.delay > 0) {
                        const delay = document.createElement('span');
                        delay.className = 'delay';
                        delay.textContent = `+${departure.stop.departure.delay}'`;
                        departureTime.appendChild(delay);
                    }
                    row.appendChild(departureTime);

                    departuresList.appendChild(row);
                });
            } else {
                departuresList.innerHTML = '<div class="no-data" data-i18n="noDepartures">Keine Abfahrten gefunden.</div>';
                updateLanguage(); // Ensure the "no departures" message is translated
            }

            // Update the last updated time
            if (lastUpdatedElement) {
                const now = new Date();
                const timeString = now.toLocaleTimeString(currentLanguage, { hour: '2-digit', minute: '2-digit' });
                lastUpdatedElement.textContent = `Letzte Aktualisierung: ${timeString}`;
            }
        })
        .catch(error => {
            console.error('Updating board failed:', error);
            // Hide loading indicator in case of error
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }
            departuresList.innerHTML = '<div class="no-data" data-i18n="loadingFailed">Laden fehlgeschlagen.</div>';
            updateLanguage(); // Ensure the "loading failed" message is translated
        });
}

// Function to format time
function formatTime(timeString) {
    const date = new Date(timeString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Function to start monitoring
let monitoringInterval;

function startMonitoring(stations) {
    if (!stations || stations.length === 0) {
        console.warn('No stations provided for monitoring.');
        return;
    }

    const dualBoards = document.getElementById('dual-boards');
    dualBoards.innerHTML = ''; // Clear existing boards

    // Determine the CSS class based on the number of stations
    let stationsClass = `stations-${stations.length}`;
    dualBoards.className = `dual-boards ${stationsClass}`;

    stations.forEach((station, index) => {
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        boardContainer.id = `board-container-${index + 1}`;

        const stationHeader = document.createElement('div');
        stationHeader.className = 'station-header';
        const displayName = station.customName || station.name;
        stationHeader.innerHTML = `
            <h2 class="stationTitle">${displayName}</h2>
            <p class="last-updated"></p>
        `;

        const departureBoard = document.createElement('div');
        departureBoard.className = 'departure-board';

         departureBoard.innerHTML = `
            <div class="board-header">
                <div data-i18n="line">Linie</div>
                <div data-i18n="destination">Ziel</div>
                <div class="header-platform" data-i18n="platform">Gleis</div>
                <div data-i18n="departure">Abfahrt</div>
            </div>
            <div class="departures-list"></div>
        `;

        boardContainer.appendChild(stationHeader);
        boardContainer.appendChild(departureBoard);
        dualBoards.appendChild(boardContainer);
    });

    updateLanguage(); // Translate the newly added elements

    // Initial update
    stations.forEach((station, index) => {
        updateBoard(station.id, `board-container-${index + 1}`, station.name);
    });

    // Set interval to update boards every 25 seconds
    if (monitoringInterval) {
        clearInterval(monitoringInterval); // Clear existing interval
    }
    monitoringInterval = setInterval(() => {
        stations.forEach((station, index) => {
            updateBoard(station.id, `board-container-${index + 1}`, station.name);
        });
    }, 25000);
}

// Language handling
function initializeLanguage() {
    currentLanguage = localStorage.getItem('language') || 'de';
    document.documentElement.setAttribute('lang', currentLanguage);
    updateLanguage();
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = translations[currentLanguage][key] || key;
        element.textContent = translation;

        // Update placeholder if it exists
         if (element.hasAttribute('data-i18n-placeholder')) {
            const placeholderKey = element.getAttribute('data-i18n-placeholder');
            const placeholderTranslation = translations[currentLanguage][placeholderKey] || placeholderKey;
            element.setAttribute('placeholder', placeholderTranslation);
        }
    });
}

const translations = {
    de: {
        title: 'ZVV Doppel-Abfahrtszeiten',
        selectStationCount: 'Anzahl Stationen wählen',
        selectStations: 'Stationen auswählen',
        startMonitoring: 'Abfahrtszeiten anzeigen',
        dataSource: 'Daten von transport.opendata.ch',
        updateInterval: 'Aktualisierung alle 25 Sekunden',
        language: 'Sprache',
        line: 'Linie',
        destination: 'Ziel',
        platform: 'Gleis',
        departure: 'Abfahrt',
        noDepartures: 'Keine Abfahrten gefunden.',
        loadingFailed: 'Laden fehlgeschlagen.',
        loading: 'Lade Abfahrtszeiten...',
        changeStations: 'Stationen ändern',
        changeLineColor: 'Linienfarbe ändern',
        lineLabel: 'Linie:',
        apply: 'Anwenden',
        cancel: 'Abbrechen',
        stationLabel: 'Station',
        stationPlaceholder: 'Station eingeben...'
    },
    en: {
        title: 'ZVV Dual Departure Times',
        selectStationCount: 'Select Number of Stations',
        selectStations: 'Select Stations',
        startMonitoring: 'Show Departure Times',
        dataSource: 'Data from transport.opendata.ch',
        updateInterval: 'Updated every 25 seconds',
        language: 'Language',
        line: 'Line',
        destination: 'Destination',
        platform: 'Platform',
        departure: 'Departure',
        noDepartures: 'No departures found.',
        loadingFailed: 'Loading failed.',
        loading: 'Loading departure times...',
        changeStations: 'Change Stations',
        changeLineColor: 'Change Line Color',
        lineLabel: 'Line:',
        apply: 'Apply',
        cancel: 'Cancel',
        stationLabel: 'Station',
        stationPlaceholder: 'Enter station...'
    }
};

// Language selector
function setupLanguageSelector() {
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');

    languageBtn.addEventListener('click', () => {
        const expanded = languageBtn.getAttribute('aria-expanded') === 'true' || false;
        languageBtn.setAttribute('aria-expanded', !expanded);
        languageDropdown.classList.toggle('hidden');
    });

    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            currentLanguage = lang;
            localStorage.setItem('language', lang);
            document.documentElement.setAttribute('lang', lang);
            updateLanguage();
            languageBtn.setAttribute('aria-expanded', false);
            languageDropdown.classList.add('hidden');
        });
    });

    document.addEventListener('click', (event) => {
        if (!languageBtn.contains(event.target) && !languageDropdown.contains(event.target)) {
            languageDropdown.classList.add('hidden');
            languageBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// Color picker functionality
function setupColorPicker() {
    const colorPickerModal = document.getElementById('color-picker-modal');
    const cancelColorBtn = document.getElementById('cancel-color');
    const applyColorBtn = document.getElementById('apply-color');
    const colorPicker = document.getElementById('color-picker');
    const selectedLineIdSpan = document.getElementById('selected-line-id');

    // Function to open the color picker modal
    window.openColorPicker = function(lineId) {
        selectedLineId = lineId;
        selectedLineIdSpan.textContent = lineId;
        colorPickerModal.classList.remove('hidden');
    };

    // Function to close the color picker modal
    function closeColorPicker() {
        colorPickerModal.classList.add('hidden');
        selectedLineId = null;
    }

    // Cancel button functionality
    cancelColorBtn.addEventListener('click', closeColorPicker);

    // Apply button functionality
    applyColorBtn.addEventListener('click', () => {
        const selectedColor = colorPicker.value;
        
        // Save color to localStorage
        localStorage.setItem(`lineColor_${selectedLineId}`, selectedColor);
        
        // Update all line elements with this ID immediately
        const lineElements = document.querySelectorAll(`[data-line-id="${selectedLineId}"]`);
        lineElements.forEach(element => {
            element.style.backgroundColor = selectedColor;
        });
        
        console.log(`Line ${selectedLineId} color updated to: ${selectedColor}`);
        closeColorPicker();
    });

    // Close the modal if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === colorPickerModal) {
            closeColorPicker();
        }
    });
}

// Station count selection and dynamic form generation
document.addEventListener('DOMContentLoaded', function() {
    initializeLanguage();
    setupLanguageSelector();
    setupColorPicker();
    
    // Check if we have stored stations on page load for full reconstruction
    const storedSelectedStations = sessionStorage.getItem('selectedStations');
    const storedStationCount = sessionStorage.getItem("stations");
    
    if (storedSelectedStations) {
        // We have complete station data, restore the board directly
        try {
            const stations = JSON.parse(storedSelectedStations);
            document.getElementById('station-count-selection').classList.add('hidden');
            document.getElementById('station-selection').classList.add('hidden');
            document.getElementById('station-customization').classList.add('hidden');
            document.getElementById('dual-boards').classList.remove('hidden');
            document.getElementById('change-stations').classList.remove('hidden');
            
            // Start monitoring immediately
            startMonitoring(stations);
        } catch (e) {
            console.error('Failed to parse stored stations:', e);
            sessionStorage.removeItem('selectedStations');
        }
    } else if (storedStationCount) {
        // We only have station count, show station selection
        showStationSelection();
        generateStationInputs(parseInt(storedStationCount));
        // Highlight the stored count button
        const countButtons = document.querySelectorAll('.count-btn');
        countButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.count === storedStationCount) {
                btn.classList.add('active');
            }
        });
    }
    
    // Setup station count buttons
    setupStationCountButtons();
    
    // Setup start monitoring button
    setupStartMonitoringButton();
});

function setupStationCountButtons() {
    const countButtons = document.querySelectorAll('.count-btn');
    
    countButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedCount = parseInt(this.dataset.count);
            
            // Remove active class from all buttons
            countButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Store the selected count
            sessionStorage.setItem("stations", selectedCount);
            
            // Show station selection phase
            showStationSelection();
            
            // Generate input fields
            generateStationInputs(selectedCount);
        });
    });
}

function showStationSelection() {
    document.getElementById('station-count-selection').classList.add('hidden');
    document.getElementById('station-selection').classList.remove('hidden');
}

function generateStationInputs(count) {
    const container = document.getElementById('station-inputs-container');
    container.innerHTML = ''; // Clear existing inputs
    
    // Create form element
    const form = document.createElement('form');
    form.id = 'stationForm';
    form.setAttribute('novalidate', 'true');
    
    for (let i = 1; i <= count; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `station-${i}`);
        label.textContent = `Station ${i}:`;
        label.setAttribute('data-i18n', 'stationLabel');
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `station-${i}`;
        input.className = 'stationInput';
        input.placeholder = 'Station eingeben...';
        input.setAttribute('data-i18n-placeholder', 'stationPlaceholder');
        input.setAttribute('autocomplete', 'off');
        input.required = true;
        
        const suggestions = document.createElement('div');
        suggestions.className = 'suggestions';
        suggestions.id = `suggestions-${i}`;
        
        searchContainer.appendChild(input);
        searchContainer.appendChild(suggestions);
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(searchContainer);
        
        form.appendChild(inputGroup);
        
        // Setup autocomplete for this input
        setupStationAutocomplete(input, suggestions);
    }
    
    container.appendChild(form);
    
    // Update language for new elements
    updateLanguage();
    
    // Check initial form validity
    checkFormValidity();
}

function setupStationAutocomplete(input, suggestionsContainer) {
    let currentRequest = null;
    let selectedIndex = -1;
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
            checkFormValidity();
            return;
        }
        
        // Cancel previous request
        if (currentRequest) {
            currentRequest.abort();
        }
        
        // Create new request
        currentRequest = new AbortController();
        
        fetch(`/v1/locations?query=${encodeURIComponent(query)}`, {
            signal: currentRequest.signal
        })
        .then(response => response.json())
        .then(data => {
            suggestionsContainer.innerHTML = '';
            selectedIndex = -1;
            
            if (data.stations && data.stations.length > 0) {
                data.stations.slice(0, 5).forEach((station, index) => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.textContent = station.name;
                    suggestionItem.dataset.stationId = station.id;
                    suggestionItem.dataset.index = index;
                    
                    suggestionItem.addEventListener('click', function() {
                        input.value = station.name;
                        input.dataset.stationId = station.id;
                        suggestionsContainer.style.display = 'none';
                        input.classList.remove('error');
                        checkFormValidity();
                    });
                    
                    suggestionsContainer.appendChild(suggestionItem);
                });
                
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        })
        .catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Autocomplete error:', error);
                suggestionsContainer.style.display = 'none';
            }
        });
    });
    
    // Handle keyboard navigation
    input.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSuggestionSelection(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSuggestionSelection(suggestions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                suggestions[selectedIndex].click();
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.style.display = 'none';
            selectedIndex = -1;
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
            selectedIndex = -1;
        }
    });
    
    // Validate on blur
    input.addEventListener('blur', function() {
        setTimeout(() => {
            if (!this.value.trim() || !this.dataset.stationId) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
            checkFormValidity();
        }, 200); // Delay to allow suggestion click to register
    });
}

function updateSuggestionSelection(suggestions) {
    suggestions.forEach((suggestion, index) => {
        suggestion.classList.toggle('selected', index === selectedIndex);
    });
}

function checkFormValidity() {
    const form = document.getElementById('stationForm');
    const startButton = document.getElementById('start-monitoring');
    
    if (!form || !startButton) return;
    
    const inputs = form.querySelectorAll('.stationInput');
    let allValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim() || !input.dataset.stationId) {
            allValid = false;
        }
    });
    
    if (allValid && inputs.length > 0) {
        startButton.disabled = false;
        startButton.classList.add('active');
    } else {
        startButton.disabled = true;
        startButton.classList.remove('active');
    }
}

function setupStartMonitoringButton() {
    const nextButton = document.getElementById('start-monitoring');
    
    nextButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        const form = document.getElementById('stationForm');
        if (!form) return;
        
        const inputs = form.querySelectorAll('.stationInput');
        const stations = [];
        let hasErrors = false;
        
        // Validate all inputs
        inputs.forEach(input => {
            if (!input.value.trim() || !input.dataset.stationId) {
                input.classList.add('error');
                hasErrors = true;
            } else {
                input.classList.remove('error');
                stations.push({
                    name: input.value,
                    id: input.dataset.stationId
                });
            }
        });
        
        if (hasErrors) {
            return;
        }
        
        // Store stations list in sessionStorage
        sessionStorage.setItem('stationList', JSON.stringify(stations));
        
        // Hide station selection and show naming phase
        document.getElementById('station-selection').classList.add('hidden');
        showNamingPhase(stations);
    });
}

function showNamingPhase(stations) {
    const customizationSection = document.getElementById('station-customization');
    const container = customizationSection.querySelector('.customization-container');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Generate name input fields for each station
    stations.forEach((station, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-input-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `custom-name-${index + 1}`);
        label.textContent = `Anzeigename für Station ${index + 1}:`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `custom-name-${index + 1}`;
        input.className = 'nameInput';
        input.placeholder = 'Custom Name...';
        input.value = station.name; // Default to station name
        input.required = true;
        
        // Add validation
        input.addEventListener('input', checkNamingFormValidity);
        input.addEventListener('blur', checkNamingFormValidity);
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        container.appendChild(inputGroup);
    });
    
    // Show the customization section
    customizationSection.classList.remove('hidden');
    
    // Setup start button for naming phase
    setupNamingStartButton();
    
    // Check initial validity
    checkNamingFormValidity();
}

function checkNamingFormValidity() {
    const startButton = document.getElementById('apply-customization');
    const nameInputs = document.querySelectorAll('.nameInput');
    
    if (!startButton) return;
    
    let allValid = true;
    nameInputs.forEach(input => {
        if (!input.value.trim()) {
            allValid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });
    
    if (allValid && nameInputs.length > 0) {
        startButton.disabled = false;
        startButton.classList.add('active');
    } else {
        startButton.disabled = true;
        startButton.classList.remove('active');
    }
}

function setupNamingStartButton() {
    const startButton = document.getElementById('apply-customization');
    
    // Remove existing listeners
    const newButton = startButton.cloneNode(true);
    startButton.parentNode.replaceChild(newButton, startButton);
    
    newButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        const nameInputs = document.querySelectorAll('.nameInput');
        const stationList = JSON.parse(sessionStorage.getItem('stationList') || '[]');
        let hasErrors = false;
        
        // Validate all name inputs
        nameInputs.forEach((input, index) => {
            if (!input.value.trim()) {
                input.classList.add('error');
                hasErrors = true;
            } else {
                input.classList.remove('error');
                if (stationList[index]) {
                    stationList[index].customName = input.value.trim();
                }
            }
        });
        
        if (hasErrors) {
            return;
        }
        
        // Save the final station list with custom names
        sessionStorage.setItem('selectedStations', JSON.stringify(stationList));
        
        // Hide customization phase and show boards
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dual-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');
        
        // Start monitoring with custom names
        startMonitoring(stationList);
    });
}

// Add event listener for the "Change Stations" button
document.getElementById('change-stations').addEventListener('click', function() {
    // Clear all stored session data
    sessionStorage.removeItem('selectedStations');
    sessionStorage.removeItem('stationList');
    sessionStorage.removeItem('stations');

    // Clear monitoring interval
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }

    // Show the station count selection and hide the boards
    document.getElementById('station-count-selection').classList.remove('hidden');
    document.getElementById('station-selection').classList.add('hidden');
    document.getElementById('station-customization').classList.add('hidden');
    document.getElementById('dual-boards').classList.add('hidden');
    document.getElementById('change-stations').classList.add('hidden');

    // Clear any existing content in the station inputs container
    const stationInputsContainer = document.getElementById('station-inputs-container');
    stationInputsContainer.innerHTML = '';

    // Clear the active state from the station count buttons
    const countButtons = document.querySelectorAll('.count-btn');
    countButtons.forEach(btn => btn.classList.remove('active'));
});
