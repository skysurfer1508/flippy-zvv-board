
// I18n translations
const i18n = {
    de: {
        title: 'ZVV Doppel-Abfahrtszeiten',
        selectStationCount: 'Anzahl Stationen wählen',
        selectStations: 'Stationen auswählen',
        startMonitoring: 'Abfahrtszeiten anzeigen',
        loading: 'Lade Abfahrtszeiten...',
        dataSource: 'Daten von transport.opendata.ch',
        updateInterval: 'Aktualisierung alle 25 Sekunden',
        changeStations: 'Stationen ändern',
        language: 'Sprache',
        changeLineColor: 'Linienfarbe ändern',
        lineLabel: 'Linie',
        apply: 'Anwenden',
        cancel: 'Abbrechen',
        stationLabel: 'Station'
    },
    en: {
        title: 'ZVV Dual Departure Times',
        selectStationCount: 'Select Number of Stations',
        selectStations: 'Select Stations',
        startMonitoring: 'Show Departure Times',
        loading: 'Loading departure times...',
        dataSource: 'Data from transport.opendata.ch',
        updateInterval: 'Updates every 25 seconds',
        changeStations: 'Change Stations',
        language: 'Language',
        changeLineColor: 'Change Line Color',
        lineLabel: 'Line',
        apply: 'Apply',
        cancel: 'Cancel',
        stationLabel: 'Station'
    }
};

let currentLang = localStorage.getItem('lang') || 'de';
let selectedStations = [];
let selectedStationCount = 2;
let updateInterval;
let currentColorTarget = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeLanguage();
    setupEventListeners();
    checkStoredStations();
});

function initializeLanguage() {
    updateLanguage(currentLang);
    document.documentElement.lang = currentLang;
}

function updateLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            element.textContent = i18n[lang][key];
        }
    });
    
    document.documentElement.lang = lang;
}

function setupEventListeners() {
    // Station count selection
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedStationCount = parseInt(this.dataset.count);
            sessionStorage.setItem('stations', selectedStationCount);
            showStationSelection();
        });
    });

    // Language selector
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    
    languageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isExpanded = languageDropdown.classList.contains('hidden');
        languageDropdown.classList.toggle('hidden');
        languageBtn.setAttribute('aria-expanded', !isExpanded);
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.language-selector')) {
            languageDropdown.classList.add('hidden');
            languageBtn.setAttribute('aria-expanded', 'false');
        }
    });

    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', function() {
            updateLanguage(this.dataset.lang);
            languageDropdown.classList.add('hidden');
            languageBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // Color picker modal
    document.getElementById('apply-color').addEventListener('click', applyLineColor);
    document.getElementById('cancel-color').addEventListener('click', closeColorPicker);
    document.getElementById('color-picker-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeColorPicker();
        }
    });

    // Start monitoring button
    document.getElementById('start-monitoring').addEventListener('click', validateAndStart);

    // Change stations button
    document.getElementById('change-stations').addEventListener('click', resetToStationSelection);
}

function showStationSelection() {
    document.getElementById('station-count-selection').classList.add('hidden');
    document.getElementById('station-selection').classList.remove('hidden');
    generateStationInputs();
}

function generateStationInputs() {
    const container = document.getElementById('station-inputs-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        
        inputGroup.innerHTML = `
            <label for="station${i}-input">${i18n[currentLang].stationLabel} ${i}</label>
            <div class="search-container">
                <input type="text" id="station${i}-input" placeholder="Station eingeben..." autocomplete="off" data-station-index="${i-1}">
                <div id="suggestions${i}" class="suggestions"></div>
            </div>
        `;
        
        container.appendChild(inputGroup);
        
        // Setup autocomplete for each input
        setupAutocomplete(i);
    }
}

function setupAutocomplete(stationIndex) {
    const input = document.getElementById(`station${stationIndex}-input`);
    const suggestionsDiv = document.getElementById(`suggestions${stationIndex}`);
    let debounceTimer;
    
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();
        
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        debounceTimer = setTimeout(() => {
            fetchLocationSuggestions(query, suggestionsDiv, input, stationIndex-1);
        }, 300);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstSuggestion = suggestionsDiv.querySelector('.suggestion-item');
            if (firstSuggestion) {
                selectStation(firstSuggestion, input, suggestionsDiv, stationIndex-1);
            }
        }
    });

    input.addEventListener('blur', function() {
        // Delay hiding to allow click on suggestions
        setTimeout(() => {
            suggestionsDiv.style.display = 'none';
        }, 200);
    });
}

function fetchLocationSuggestions(query, suggestionsDiv, input, stationIndex) {
    fetch(`/v1/locations?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            suggestionsDiv.innerHTML = '';
            
            if (data.stations && data.stations.length > 0) {
                data.stations.slice(0, 8).forEach(station => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.textContent = station.name;
                    suggestionItem.addEventListener('click', () => {
                        selectStation(suggestionItem, input, suggestionsDiv, stationIndex);
                    });
                    suggestionsDiv.appendChild(suggestionItem);
                });
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            suggestionsDiv.style.display = 'none';
        });
}

function selectStation(suggestionItem, input, suggestionsDiv, stationIndex) {
    const stationName = suggestionItem.textContent;
    input.value = stationName;
    input.classList.remove('error');
    suggestionsDiv.style.display = 'none';
    
    // Store selected station
    if (!selectedStations[stationIndex]) {
        selectedStations[stationIndex] = {};
    }
    selectedStations[stationIndex].name = stationName;
}

function validateAndStart() {
    let isValid = true;
    selectedStations = [];
    
    for (let i = 1; i <= selectedStationCount; i++) {
        const input = document.getElementById(`station${i}-input`);
        const value = input.value.trim();
        
        if (!value) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
            selectedStations.push({
                name: value,
                customName: value
            });
        }
    }
    
    if (isValid) {
        sessionStorage.setItem('selectedStations', JSON.stringify(selectedStations));
        startMonitoring();
    }
}

function startMonitoring() {
    document.getElementById('station-selection').classList.add('hidden');
    document.getElementById('dual-boards').classList.remove('hidden');
    document.getElementById('change-stations').classList.remove('hidden');
    
    // Set grid class based on station count
    const dualBoards = document.getElementById('dual-boards');
    dualBoards.className = `dual-boards stations-${selectedStationCount}`;
    
    generateStationBoards();
    loadAllDepartures();
    
    // Start auto-refresh
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(loadAllDepartures, 25000);
}

function generateStationBoards() {
    const container = document.getElementById('dual-boards');
    container.innerHTML = '';
    
    selectedStations.forEach((station, index) => {
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        boardContainer.innerHTML = `
            <div class="station-header">
                <h2 id="station${index+1}-name">${station.customName || station.name}</h2>
                <div class="last-updated" id="station${index+1}-updated">${i18n[currentLang].loading}</div>
            </div>
            <div class="departure-board">
                <div class="board-header">
                    <div class="header-line">Linie</div>
                    <div class="header-destination">Ziel</div>
                    <div class="header-platform">Gleis</div>
                    <div class="header-time">Abfahrt</div>
                </div>
                <div id="departures${index+1}" class="departures-list">
                    <div class="no-data">${i18n[currentLang].loading}</div>
                </div>
            </div>
        `;
        container.appendChild(boardContainer);
    });
}

function loadAllDepartures() {
    selectedStations.forEach((station, index) => {
        loadDepartures(station.name, index + 1);
    });
}

function loadDepartures(stationName, boardIndex) {
    fetch(`/v1/stationboard?station=${encodeURIComponent(stationName)}&limit=15`)
        .then(response => response.json())
        .then(data => {
            displayDepartures(data, boardIndex);
            updateLastUpdatedTime(boardIndex);
        })
        .catch(error => {
            console.error(`Error loading departures for ${stationName}:`, error);
            const departuresDiv = document.getElementById(`departures${boardIndex}`);
            departuresDiv.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
        });
}

function displayDepartures(data, boardIndex) {
    const departuresDiv = document.getElementById(`departures${boardIndex}`);
    
    if (!data.stationboard || data.stationboard.length === 0) {
        departuresDiv.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
        return;
    }

    const departuresHtml = data.stationboard.map(departure => {
        const lineNumber = departure.category + departure.number;
        const lineClass = getLineClass(departure.category);
        const lineColor = getStoredLineColor(lineNumber) || getDefaultLineColor(departure.category);
        const departureTime = formatDepartureTime(departure.stop.departure);
        const delay = departure.stop.delay || 0;
        const platform = departure.stop.platform || '';

        return `
            <div class="departure-row">
                <span class="line-number ${lineClass}" 
                      style="background-color: ${lineColor}; color: ${getContrastColor(lineColor)}"
                      onclick="openColorPicker('${lineNumber}')"
                      role="button"
                      tabindex="0"
                      aria-label="${i18n[currentLang].changeLineColor} ${lineNumber}"
                      onkeydown="if(event.key==='Enter'||event.key===' ') openColorPicker('${lineNumber}')">
                    ${departure.number}
                </span>
                <span class="destination">${departure.to}</span>
                <span class="platform">${platform}</span>
                <span class="departure-time">
                    ${departureTime}
                    ${delay > 0 ? `<span class="delay">+${Math.round(delay / 60)}'</span>` : ''}
                </span>
            </div>
        `;
    }).join('');

    departuresDiv.innerHTML = departuresHtml;
}

function getLineClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('bus')) return 'bus';
    if (cat.includes('tram')) return 'tram';
    return 'train';
}

function getDefaultLineColor(category) {
    const colors = {
        tram: '#4ecdc4',
        bus: '#ff6b6b',
        default: '#ffd700'
    };
    return colors[getLineClass(category)] || colors.default;
}

function getStoredLineColor(lineId) {
    return localStorage.getItem(`lineColor_${lineId}`);
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

function formatDepartureTime(departureString) {
    const now = new Date();
    const departure = new Date(departureString);
    const diffMinutes = Math.round((departure - now) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Jetzt';
    if (diffMinutes === 1) return '1 Min';
    if (diffMinutes < 60) return `${diffMinutes} Min`;
    
    return departure.toLocaleTimeString('de-CH', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function updateLastUpdatedTime(boardIndex) {
    const updatedDiv = document.getElementById(`station${boardIndex}-updated`);
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-CH', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    updatedDiv.textContent = `${timeString}`;
}

function openColorPicker(lineId) {
    currentColorTarget = lineId;
    document.getElementById('selected-line-id').textContent = lineId;
    
    // Set current color
    const currentColor = getStoredLineColor(lineId) || '#ffd700';
    document.getElementById('color-picker').value = currentColor;
    
    document.getElementById('color-picker-modal').classList.remove('hidden');
}

function closeColorPicker() {
    document.getElementById('color-picker-modal').classList.add('hidden');
    currentColorTarget = null;
}

function applyLineColor() {
    if (!currentColorTarget) return;
    
    const newColor = document.getElementById('color-picker').value;
    localStorage.setItem(`lineColor_${currentColorTarget}`, newColor);
    
    // Update all visible instances of this line
    document.querySelectorAll('.line-number').forEach(element => {
        const lineText = element.textContent.trim();
        if (element.onclick && element.onclick.toString().includes(currentColorTarget)) {
            element.style.backgroundColor = newColor;
            element.style.color = getContrastColor(newColor);
        }
    });
    
    closeColorPicker();
}

function resetToStationSelection() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    document.getElementById('dual-boards').classList.add('hidden');
    document.getElementById('change-stations').classList.add('hidden');
    document.getElementById('station-count-selection').classList.remove('hidden');
    
    // Reset active state
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.count) === selectedStationCount) {
            btn.classList.add('active');
        }
    });
}

function checkStoredStations() {
    const storedStations = sessionStorage.getItem('selectedStations');
    const storedCount = sessionStorage.getItem('stations');
    
    if (storedStations && storedCount) {
        selectedStations = JSON.parse(storedStations);
        selectedStationCount = parseInt(storedCount);
        
        // Activate the correct count button
        document.querySelectorAll('.count-btn').forEach(btn => {
            if (parseInt(btn.dataset.count) === selectedStationCount) {
                btn.classList.add('active');
            }
        });
        
        startMonitoring();
    }
}

// Handle keyboard navigation for accessibility
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('color-picker-modal');
        if (!modal.classList.contains('hidden')) {
            closeColorPicker();
        }
        
        const dropdown = document.getElementById('language-dropdown');
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
            document.getElementById('language-btn').setAttribute('aria-expanded', 'false');
        }
    }
});
