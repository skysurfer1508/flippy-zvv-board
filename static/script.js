
// ZVV Multi-Station Departure Board
class ZVVDepartureBoard {
    constructor() {
        this.stations = [];
        this.selectedStationCount = 1;
        this.customStationNames = {};
        this.lineColors = {
            tram: '#4ecdc4',
            bus: '#ff6b6b',
            train: '#ffd700'
        };
        this.customLineColors = JSON.parse(localStorage.getItem('customLineColors') || '{}');
        this.currentLanguage = localStorage.getItem('language') || 'de';
        this.updateIntervals = [];
        this.translations = {
            de: {
                title: 'ZVV Doppel-Abfahrtszeiten',
                stationCount: 'Anzahl Stationen auswählen:',
                station: 'Station',
                startMonitoring: 'Abfahrtszeiten anzeigen',
                customizeStations: 'Stationen anpassen',
                displayName: 'Anzeigename für Station',
                lineColors: 'Linien-Farben anpassen',
                tramColor: 'Tram-Farbe:',
                busColor: 'Bus-Farbe:',
                trainColor: 'Zug-Farbe:',
                startDisplay: 'Anzeige starten',
                loading: 'Lade Abfahrtszeiten...',
                dataSource: 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
                changeStations: 'Stationen ändern',
                changeLineColor: 'Linienfarbe ändern',
                apply: 'Anwenden',
                cancel: 'Abbrechen',
                line: 'Linie',
                destination: 'Ziel',
                platform: 'Gleis',
                departure: 'Abfahrt',
                enterStation: 'Station eingeben...',
                noData: 'Keine Abfahrten verfügbar',
                delay: 'Verspätung'
            },
            en: {
                title: 'ZVV Dual Departure Times',
                stationCount: 'Select number of stations:',
                station: 'Station',
                startMonitoring: 'Show departure times',
                customizeStations: 'Customize stations',
                displayName: 'display name for station',
                lineColors: 'Customize line colors',
                tramColor: 'Tram color:',
                busColor: 'Bus color:',
                trainColor: 'Train color:',
                startDisplay: 'Start display',
                loading: 'Loading departure times...',
                dataSource: 'Data from transport.opendata.ch | Updated every 25 seconds',
                changeStations: 'Change stations',
                changeLineColor: 'Change line color',
                apply: 'Apply',
                cancel: 'Cancel',
                line: 'Line',
                destination: 'Destination',
                platform: 'Platform',
                departure: 'Departure',
                enterStation: 'Enter station...',
                noData: 'No departures available',
                delay: 'Delay'
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateStationInputs();
        this.updateLanguage();
    }

    setupEventListeners() {
        // Station count selection
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.station-count-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedStationCount = parseInt(e.target.dataset.count);
                this.generateStationInputs();
                this.generateCustomizationInputs();
            });
        });

        // Start monitoring button
        document.getElementById('start-monitoring').addEventListener('click', () => {
            if (this.validateStations()) {
                this.showCustomization();
            }
        });

        // Apply customization button
        document.getElementById('apply-customization').addEventListener('click', () => {
            this.applyCustomization();
            this.startMonitoring();
        });

        // Change stations button
        document.getElementById('change-stations').addEventListener('click', () => {
            this.resetToStationSelection();
        });

        // Language selection
        document.getElementById('language-btn').addEventListener('click', () => {
            const menu = document.getElementById('language-menu');
            menu.classList.toggle('hidden');
        });

        document.querySelectorAll('.language-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentLanguage = e.target.dataset.lang;
                localStorage.setItem('language', this.currentLanguage);
                this.updateLanguage();
                document.getElementById('language-menu').classList.add('hidden');
            });
        });

        // Close language menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) {
                document.getElementById('language-menu').classList.add('hidden');
            }
        });

        // Line color modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('line-color-modal').classList.add('hidden');
        });

        document.getElementById('cancel-line-color').addEventListener('click', () => {
            document.getElementById('line-color-modal').classList.add('hidden');
        });

        document.getElementById('apply-line-color').addEventListener('click', () => {
            this.applyLineColor();
        });

        // Close modal when clicking outside
        document.getElementById('line-color-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.add('hidden');
            }
        });
    }

    generateStationInputs() {
        const container = document.getElementById('station-inputs');
        container.innerHTML = '';

        for (let i = 1; i <= this.selectedStationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';
            inputGroup.innerHTML = `
                <label for="station${i}-input">${this.t('station')} ${i}</label>
                <div class="search-container">
                    <input type="text" id="station${i}-input" placeholder="${this.t('enterStation')}" autocomplete="off">
                    <div id="suggestions${i}" class="suggestions"></div>
                </div>
            `;
            container.appendChild(inputGroup);

            // Add event listeners for this input
            this.setupStationInputListeners(i);
        }

        this.updateStartButton();
    }

    generateCustomizationInputs() {
        const container = document.getElementById('customization-inputs');
        container.innerHTML = '';

        for (let i = 1; i <= this.selectedStationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'custom-input-group';
            inputGroup.innerHTML = `
                <label for="custom-name${i}">${this.t('displayName')} ${i}:</label>
                <input type="text" id="custom-name${i}" placeholder="Custom Name...">
            `;
            container.appendChild(inputGroup);
        }
    }

    setupStationInputListeners(stationIndex) {
        const input = document.getElementById(`station${stationIndex}-input`);
        const suggestionsDiv = document.getElementById(`suggestions${stationIndex}`);
        let currentSuggestions = [];
        let selectedIndex = -1;

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                suggestionsDiv.style.display = 'none';
                this.updateStartButton();
                return;
            }

            try {
                const response = await fetch(`http://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`);
                const data = await response.json();
                
                currentSuggestions = data.stations || [];
                this.displaySuggestions(currentSuggestions, suggestionsDiv, input, stationIndex);
                
            } catch (error) {
                console.error('Error fetching stations:', error);
                suggestionsDiv.style.display = 'none';
            }

            this.updateStartButton();
        });

        input.addEventListener('keydown', (e) => {
            const visibleSuggestions = suggestionsDiv.querySelectorAll('.suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, visibleSuggestions.length - 1);
                this.updateSelectedSuggestion(visibleSuggestions, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                this.updateSelectedSuggestion(visibleSuggestions, selectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && visibleSuggestions[selectedIndex]) {
                    visibleSuggestions[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                suggestionsDiv.style.display = 'none';
                selectedIndex = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest(`#station${stationIndex}-input`) && !e.target.closest(`#suggestions${stationIndex}`)) {
                suggestionsDiv.style.display = 'none';
                selectedIndex = -1;
            }
        });
    }

    displaySuggestions(suggestions, suggestionsDiv, input, stationIndex) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = '';
        suggestions.forEach((station, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = station.name;
            suggestionItem.addEventListener('click', () => {
                input.value = station.name;
                input.dataset.stationId = station.id;
                suggestionsDiv.style.display = 'none';
                this.updateStartButton();
            });
            suggestionsDiv.appendChild(suggestionItem);
        });

        suggestionsDiv.style.display = 'block';
    }

    updateSelectedSuggestion(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    validateStations() {
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const input = document.getElementById(`station${i}-input`);
            if (!input.value.trim() || !input.dataset.stationId) {
                return false;
            }
        }
        return true;
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-monitoring');
        startBtn.disabled = !this.validateStations();
    }

    showCustomization() {
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.remove('hidden');
        
        // Pre-fill custom names with station names
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const stationInput = document.getElementById(`station${i}-input`);
            const customInput = document.getElementById(`custom-name${i}`);
            if (customInput) {
                customInput.value = stationInput.value;
            }
        }
    }

    applyCustomization() {
        // Store custom station names
        this.customStationNames = {};
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const customInput = document.getElementById(`custom-name${i}`);
            if (customInput && customInput.value.trim()) {
                this.customStationNames[i] = customInput.value.trim();
            }
        }

        // Store line colors
        this.lineColors.tram = document.getElementById('tram-color').value;
        this.lineColors.bus = document.getElementById('bus-color').value;
        this.lineColors.train = document.getElementById('train-color').value;
    }

    startMonitoring() {
        // Collect station data
        this.stations = [];
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const input = document.getElementById(`station${i}-input`);
            this.stations.push({
                id: input.dataset.stationId,
                name: input.value,
                customName: this.customStationNames[i] || input.value
            });
        }

        // Hide customization and show boards
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('multi-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');

        this.setupBoards();
        this.startUpdating();
    }

    setupBoards() {
        const boardsContainer = document.getElementById('multi-boards');
        boardsContainer.className = `multi-boards stations-${this.selectedStationCount}`;
        boardsContainer.innerHTML = '';

        this.stations.forEach((station, index) => {
            const boardHtml = `
                <div class="board-container">
                    <div class="station-header">
                        <h2 id="station${index + 1}-name">${station.customName}</h2>
                        <div class="last-updated" id="station${index + 1}-updated">${this.t('loading')}</div>
                    </div>
                    <div class="departure-board">
                        <div class="board-header">
                            <div class="header-line">${this.t('line')}</div>
                            <div class="header-destination">${this.t('destination')}</div>
                            <div class="header-platform">${this.t('platform')}</div>
                            <div class="header-time">${this.t('departure')}</div>
                        </div>
                        <div id="departures${index + 1}" class="departures-list">
                            <div class="no-data">${this.t('loading')}</div>
                        </div>
                    </div>
                </div>
            `;
            boardsContainer.innerHTML += boardHtml;
        });
    }

    startUpdating() {
        // Clear existing intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Update each station
        this.stations.forEach((station, index) => {
            this.updateDepartures(station, index + 1);
            
            // Set up periodic updates
            const interval = setInterval(() => {
                this.updateDepartures(station, index + 1);
            }, 25000);
            
            this.updateIntervals.push(interval);
        });
    }

    async updateDepartures(station, boardNumber) {
        try {
            const response = await fetch(`http://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=10`);
            const data = await response.json();

            if (data.stationboard && data.stationboard.length > 0) {
                this.displayDepartures(data.stationboard, boardNumber);
                this.updateLastUpdated(boardNumber);
            } else {
                this.displayNoDepartures(boardNumber);
            }
        } catch (error) {
            console.error(`Error fetching departures for ${station.name}:`, error);
            this.displayError(boardNumber);
        }
    }

    displayDepartures(departures, boardNumber) {
        const departuresContainer = document.getElementById(`departures${boardNumber}`);
        
        if (departures.length === 0) {
            departuresContainer.innerHTML = `<div class="no-data">${this.t('noData')}</div>`;
            return;
        }

        departuresContainer.innerHTML = '';
        
        departures.forEach(departure => {
            const departureTime = new Date(departure.stop.departure);
            const now = new Date();
            const minutesUntil = Math.ceil((departureTime - now) / 60000);
            
            const delay = departure.stop.delay || 0;
            const delayMinutes = Math.round(delay / 60);
            
            const timeDisplay = minutesUntil <= 0 ? 'Jetzt' : `${minutesUntil}'`;
            const delayDisplay = delayMinutes > 0 ? `+${delayMinutes}'` : '';
            
            const lineType = this.getLineType(departure.category);
            const lineColor = this.getLineColor(departure.number, lineType);
            
            const row = document.createElement('div');
            row.className = 'departure-row';
            row.innerHTML = `
                <div class="line-number ${lineType}" 
                     style="background-color: ${lineColor}; color: ${this.getContrastColor(lineColor)}"
                     data-line="${departure.number}" 
                     data-type="${lineType}"
                     onclick="zvvBoard.showLineColorModal('${departure.number}', '${lineType}', '${lineColor}')">
                    ${departure.number}
                </div>
                <div class="destination">${departure.to}</div>
                <div class="platform">${departure.stop.platform || '-'}</div>
                <div class="departure-time">
                    ${timeDisplay}
                    ${delayDisplay ? `<span class="delay">${delayDisplay}</span>` : ''}
                </div>
            `;
            
            departuresContainer.appendChild(row);
        });
    }

    displayNoDepartures(boardNumber) {
        const departuresContainer = document.getElementById(`departures${boardNumber}`);
        departuresContainer.innerHTML = `<div class="no-data">${this.t('noData')}</div>`;
    }

    displayError(boardNumber) {
        const departuresContainer = document.getElementById(`departures${boardNumber}`);
        departuresContainer.innerHTML = '<div class="no-data">Fehler beim Laden</div>';
    }

    updateLastUpdated(boardNumber) {
        const updatedElement = document.getElementById(`station${boardNumber}-updated`);
        const now = new Date();
        const timeString = now.toLocaleTimeString('de-CH', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        updatedElement.textContent = `Stand: ${timeString}`;
    }

    getLineType(category) {
        if (!category) return 'train';
        
        const cat = category.toLowerCase();
        if (cat.includes('tram') || cat.includes('t')) return 'tram';
        if (cat.includes('bus') || cat.includes('b')) return 'bus';
        return 'train';
    }

    getLineColor(lineNumber, lineType) {
        // Check for custom colors first
        const customKey = `${lineType}-${lineNumber}`;
        if (this.customLineColors[customKey]) {
            return this.customLineColors[customKey];
        }
        
        // Return default colors
        return this.lineColors[lineType] || this.lineColors.train;
    }

    getContrastColor(backgroundColor) {
        // Convert hex to RGB
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    showLineColorModal(lineNumber, lineType, currentColor) {
        const modal = document.getElementById('line-color-modal');
        const title = document.getElementById('modal-title');
        const info = document.getElementById('modal-line-info');
        const colorPicker = document.getElementById('line-color-picker');
        
        title.textContent = this.t('changeLineColor');
        info.textContent = `${this.t('line')} ${lineNumber} (${lineType.charAt(0).toUpperCase() + lineType.slice(1)})`;
        colorPicker.value = currentColor;
        
        // Store current line info
        modal.dataset.lineNumber = lineNumber;
        modal.dataset.lineType = lineType;
        
        modal.classList.remove('hidden');
    }

    applyLineColor() {
        const modal = document.getElementById('line-color-modal');
        const lineNumber = modal.dataset.lineNumber;
        const lineType = modal.dataset.lineType;
        const newColor = document.getElementById('line-color-picker').value;
        
        // Store custom color
        const customKey = `${lineType}-${lineNumber}`;
        this.customLineColors[customKey] = newColor;
        localStorage.setItem('customLineColors', JSON.stringify(this.customLineColors));
        
        // Update all visible line elements
        document.querySelectorAll(`[data-line="${lineNumber}"][data-type="${lineType}"]`).forEach(element => {
            element.style.backgroundColor = newColor;
            element.style.color = this.getContrastColor(newColor);
        });
        
        modal.classList.add('hidden');
    }

    resetToStationSelection() {
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];
        
        // Reset UI
        document.getElementById('multi-boards').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
        
        // Clear station data
        this.stations = [];
        this.customStationNames = {};
    }

    updateLanguage() {
        document.documentElement.lang = this.currentLanguage;
        
        // Update all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Update placeholders
        document.querySelectorAll('input[placeholder]').forEach(input => {
            if (input.id.includes('station') && input.id.includes('-input')) {
                input.placeholder = this.t('enterStation');
            }
        });
    }

    t(key) {
        return this.translations[this.currentLanguage]?.[key] || key;
    }
}

// Initialize the application
let zvvBoard;
document.addEventListener('DOMContentLoaded', () => {
    zvvBoard = new ZVVDepartureBoard();
});
