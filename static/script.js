// ZVV Dual Departure Board - Enhanced with Multi-Station Support
class ZVVDepartureBoard {
    constructor() {
        this.selectedStationCount = 0;
        this.selectedStations = [];
        this.customNames = {};
        this.lineColors = {
            tram: '#4ecdc4',
            bus: '#ff6b6b', 
            train: '#ffd700'
        };
        this.updateIntervals = [];
        this.currentSuggestionIndex = -1;
        
        this.init();
        this.restoreSession();
    }

    init() {
        console.log('Initializing ZVV Departure Board...');
        this.bindEvents();
        this.setupLanguageSelector();
    }

    bindEvents() {
        // Station count selection
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Station count selected:', e.target.dataset.count);
                this.selectStationCount(parseInt(e.target.dataset.count));
            });
        });

        // Start monitoring button
        const startBtn = document.getElementById('start-monitoring');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('Start monitoring clicked');
                this.showCustomizationPhase();
            });
        }

        // Apply customization button
        const applyBtn = document.getElementById('apply-customization');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                console.log('Apply customization clicked');
                this.startMonitoring();
            });
        }

        // Change stations button
        const changeBtn = document.getElementById('change-stations');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                console.log('Change stations clicked');
                this.resetToStationSelection();
            });
        }

        // Color picker events
        this.bindColorPickerEvents();
    }

    selectStationCount(count) {
        console.log(`Selecting ${count} stations`);
        this.selectedStationCount = count;
        this.selectedStations = [];
        
        // Update button states
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
        });

        // Show station selection phase
        this.showStationSelection();
        this.saveSession();
    }

    showStationSelection() {
        console.log('Showing station selection phase');
        
        // Hide station count selection
        document.getElementById('station-count-selection').classList.add('hidden');
        
        // Show station selection
        const stationSelection = document.getElementById('station-selection');
        stationSelection.classList.remove('hidden');

        // Generate station inputs
        this.generateStationInputs();
    }

    generateStationInputs() {
        console.log(`Generating ${this.selectedStationCount} station inputs`);
        const container = document.getElementById('station-inputs-container');
        container.innerHTML = '';

        for (let i = 0; i < this.selectedStationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';

            const label = document.createElement('label');
            label.textContent = `Station ${i + 1}:`;
            label.setAttribute('for', `station-${i}`);

            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `station-${i}`;
            input.className = 'station-input';
            input.placeholder = 'Station eingeben...';
            input.autocomplete = 'off';

            const suggestions = document.createElement('div');
            suggestions.className = 'suggestions';
            suggestions.id = `suggestions-${i}`;

            searchContainer.appendChild(input);
            searchContainer.appendChild(suggestions);
            inputGroup.appendChild(label);
            inputGroup.appendChild(searchContainer);
            container.appendChild(inputGroup);

            // Bind events for this input
            this.bindStationInputEvents(input, suggestions, i);
        }

        this.updateStartButton();
    }

    bindStationInputEvents(input, suggestions, index) {
        let searchTimeout;

        console.log(`Binding events for station input ${index}`);

        // Input event for search
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            console.log(`Input event for station ${index}: "${query}"`);
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                this.hideSuggestions(suggestions);
                return;
            }

            searchTimeout = setTimeout(() => {
                this.searchStations(query, suggestions, input, index);
            }, 300);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const suggestionItems = suggestions.querySelectorAll('.suggestion-item');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.currentSuggestionIndex = Math.min(
                        this.currentSuggestionIndex + 1, 
                        suggestionItems.length - 1
                    );
                    this.updateSuggestionSelection(suggestionItems);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
                    this.updateSuggestionSelection(suggestionItems);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (this.currentSuggestionIndex >= 0 && suggestionItems[this.currentSuggestionIndex]) {
                        suggestionItems[this.currentSuggestionIndex].click();
                    }
                    break;
                    
                case 'Escape':
                    this.hideSuggestions(suggestions);
                    break;
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                this.hideSuggestions(suggestions);
            }
        });

        // Focus events
        input.addEventListener('focus', () => {
            if (input.value.length >= 2) {
                this.searchStations(input.value, suggestions, input, index);
            }
        });

        input.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                if (!suggestions.matches(':hover')) {
                    this.hideSuggestions(suggestions);
                }
            }, 150);
        });
    }

    async searchStations(query, suggestions, input, index) {
        console.log(`Searching stations for query: "${query}"`);
        
        try {
            // Use the correct API endpoint from Flask backend
            const response = await fetch(`/api/locations?query=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stations = await response.json();
            console.log('API response:', stations);
            
            this.displaySuggestions(stations, suggestions, input, index);
            
        } catch (error) {
            console.error('Error searching stations:', error);
            this.hideSuggestions(suggestions);
        }
    }

    displaySuggestions(stations, suggestions, input, index) {
        console.log(`Displaying ${stations.length} suggestions for station ${index}`);
        
        suggestions.innerHTML = '';
        this.currentSuggestionIndex = -1;

        if (!stations || stations.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        stations.forEach((station, i) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = station.name;
            item.dataset.stationId = station.id;
            item.dataset.stationName = station.name;

            item.addEventListener('click', () => {
                console.log(`Selected station: ${station.name} (${station.id})`);
                this.selectStation(station, input, suggestions, index);
            });

            suggestions.appendChild(item);
        });

        suggestions.style.display = 'block';
    }

    selectStation(station, input, suggestions, index) {
        console.log(`Selecting station ${index}:`, station);
        
        input.value = station.name;
        input.dataset.stationId = station.id;
        input.classList.remove('error');
        
        this.selectedStations[index] = {
            id: station.id,
            name: station.name
        };

        this.hideSuggestions(suggestions);
        this.updateStartButton();
        this.saveSession();
    }

    hideSuggestions(suggestions) {
        suggestions.style.display = 'none';
        suggestions.innerHTML = '';
        this.currentSuggestionIndex = -1;
    }

    updateSuggestionSelection(suggestionItems) {
        suggestionItems.forEach((item, index) => {
            item.classList.toggle('selected', index === this.currentSuggestionIndex);
        });
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-monitoring');
        const allSelected = this.selectedStations.filter(s => s && s.id).length === this.selectedStationCount;
        
        console.log(`Start button enabled: ${allSelected} (${this.selectedStations.length}/${this.selectedStationCount})`);
        
        startBtn.disabled = !allSelected;
        startBtn.textContent = allSelected ? 
            'Weiter zur Anpassung' : 
            `${this.selectedStations.filter(s => s && s.id).length}/${this.selectedStationCount} Stationen ausgewählt`;
    }

    showCustomizationPhase() {
        console.log('Showing customization phase');
        
        // Hide station selection
        document.getElementById('station-selection').classList.add('hidden');
        
        // Show customization
        document.getElementById('station-customization').classList.remove('hidden');
        
        // Generate custom name inputs
        this.generateCustomNameInputs();
    }

    generateCustomNameInputs() {
        const container = document.querySelector('.customization-container');
        container.innerHTML = '';

        this.selectedStations.forEach((station, index) => {
            if (station && station.id) {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'custom-input-group';

                const label = document.createElement('label');
                label.textContent = `Anzeigename für ${station.name}:`;
                label.setAttribute('for', `custom-name-${index}`);

                const input = document.createElement('input');
                input.type = 'text';
                input.id = `custom-name-${index}`;
                input.placeholder = station.name;
                input.value = this.customNames[station.id] || '';

                input.addEventListener('input', (e) => {
                    this.customNames[station.id] = e.target.value;
                    this.saveSession();
                });

                inputGroup.appendChild(label);
                inputGroup.appendChild(input);
                container.appendChild(inputGroup);
            }
        });
    }

    startMonitoring() {
        console.log('Starting monitoring with stations:', this.selectedStations);
        
        // Hide customization
        document.getElementById('station-customization').classList.add('hidden');
        
        // Show dual boards
        const dualBoards = document.getElementById('dual-boards');
        dualBoards.classList.remove('hidden');
        dualBoards.className = `dual-boards stations-${this.selectedStationCount}`;
        
        // Show change stations button
        document.getElementById('change-stations').classList.remove('hidden');
        
        // Generate boards
        this.generateBoards();
        
        // Start updates
        this.startUpdates();
    }

    generateBoards() {
        const container = document.getElementById('dual-boards');
        container.innerHTML = '';

        this.selectedStations.forEach((station, index) => {
            if (station && station.id) {
                const boardContainer = document.createElement('div');
                boardContainer.className = 'board-container';
                boardContainer.id = `board-${index}`;

                const displayName = this.customNames[station.id] || station.name;

                boardContainer.innerHTML = `
                    <div class="station-header">
                        <h2>${displayName}</h2>
                        <div class="last-updated" id="updated-${index}">Wird geladen...</div>
                    </div>
                    <div class="departure-board">
                        <div class="board-header">
                            <div class="header-line">Linie</div>
                            <div class="header-destination">Richtung</div>
                            <div class="header-platform">Gleis</div>
                            <div class="header-time">Abfahrt</div>
                        </div>
                        <div class="departures-list" id="departures-${index}">
                            <div class="loading">
                                <div class="loading-spinner"></div>
                                <p>Lade Abfahrtszeiten...</p>
                            </div>
                        </div>
                    </div>
                `;

                container.appendChild(boardContainer);
            }
        });
    }

    async startUpdates() {
        console.log('Starting departure updates');
        
        // Clear existing intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Update each station
        this.selectedStations.forEach((station, index) => {
            if (station && station.id) {
                // Initial load
                this.updateDepartures(station.id, index);
                
                // Set up interval
                const interval = setInterval(() => {
                    this.updateDepartures(station.id, index);
                }, 25000);
                
                this.updateIntervals.push(interval);
            }
        });
    }

    async updateDepartures(stationId, boardIndex) {
        console.log(`Updating departures for station ${stationId}, board ${boardIndex}`);
        
        try {
            const response = await fetch(`/api/board?station=${encodeURIComponent(stationId)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Departures data for board ${boardIndex}:`, data);
            
            this.displayDepartures(data.departures || [], boardIndex);
            this.updateLastUpdated(boardIndex);
            
        } catch (error) {
            console.error(`Error updating departures for board ${boardIndex}:`, error);
            this.displayError(boardIndex);
        }
    }

    displayDepartures(departures, boardIndex) {
        const container = document.getElementById(`departures-${boardIndex}`);
        
        if (!departures || departures.length === 0) {
            container.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
            return;
        }

        container.innerHTML = '';

        departures.slice(0, 12).forEach(departure => {
            const row = document.createElement('div');
            row.className = 'departure-row';

            const departureTime = this.formatDepartureTime(departure.departure);
            const delayDisplay = departure.delay > 0 ? 
                `<span class="delay">+${departure.delay}'</span>` : '';

            const lineColor = this.getLineColor(departure);

            row.innerHTML = `
                <div class="line-number ${departure.category.toLowerCase()}" 
                     style="background-color: ${lineColor};"
                     data-line="${departure.line}" 
                     tabindex="0"
                     role="button"
                     aria-label="Farbe für Linie ${departure.line} ändern">
                    ${departure.line}
                </div>
                <div class="destination">${departure.destination}</div>
                <div class="platform">${departure.platform || '-'}</div>
                <div class="departure-time">
                    ${departureTime}
                    ${delayDisplay}
                </div>
            `;

            // Add click event for color changing
            const lineElement = row.querySelector('.line-number');
            lineElement.addEventListener('click', () => {
                this.showColorPicker(departure.line, lineColor);
            });

            container.appendChild(row);
        });
    }

    formatDepartureTime(departureTimeString) {
        try {
            const date = new Date(departureTimeString);
            const now = new Date();
            const diffMinutes = Math.round((date - now) / (1000 * 60));

            if (diffMinutes <= 0) {
                return 'Jetzt';
            } else if (diffMinutes < 60) {
                return `${diffMinutes}'`;
            } else {
                return date.toLocaleTimeString('de-CH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        } catch (error) {
            console.error('Error formatting departure time:', error);
            return '--:--';
        }
    }

    getLineColor(departure) {
        const category = departure.category.toLowerCase();
        return this.lineColors[category] || this.lineColors.train;
    }

    updateLastUpdated(boardIndex) {
        const element = document.getElementById(`updated-${boardIndex}`);
        if (element) {
            const now = new Date();
            element.textContent = `Aktualisiert: ${now.toLocaleTimeString('de-CH')}`;
        }
    }

    displayError(boardIndex) {
        const container = document.getElementById(`departures-${boardIndex}`);
        container.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
    }

    resetToStationSelection() {
        console.log('Resetting to station selection');
        
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Hide all phases except station count
        document.getElementById('dual-boards').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        
        // Show station count selection
        document.getElementById('station-count-selection').classList.remove('hidden');
        
        // Reset state
        this.selectedStationCount = 0;
        this.selectedStations = [];
        
        // Reset button states
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        this.clearSession();
    }

    bindColorPickerEvents() {
        const modal = document.getElementById('color-picker-modal');
        const applyBtn = document.getElementById('apply-color');
        const cancelBtn = document.getElementById('cancel-color');

        applyBtn?.addEventListener('click', () => {
            const newColor = document.getElementById('color-picker').value;
            const lineId = document.getElementById('selected-line-id').textContent;
            this.applyLineColor(lineId, newColor);
            this.hideColorPicker();
        });

        cancelBtn?.addEventListener('click', () => {
            this.hideColorPicker();
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideColorPicker();
            }
        });
    }

    showColorPicker(lineId, currentColor) {
        const modal = document.getElementById('color-picker-modal');
        const picker = document.getElementById('color-picker');
        const lineIdSpan = document.getElementById('selected-line-id');

        lineIdSpan.textContent = lineId;
        picker.value = currentColor;
        modal.classList.remove('hidden');
    }

    hideColorPicker() {
        document.getElementById('color-picker-modal').classList.add('hidden');
    }

    applyLineColor(lineId, color) {
        document.querySelectorAll(`[data-line="${lineId}"]`).forEach(element => {
            element.style.backgroundColor = color;
        });
    }

    setupLanguageSelector() {
        const languageBtn = document.getElementById('language-btn');
        const dropdown = document.getElementById('language-dropdown');
        const options = document.querySelectorAll('.language-option');

        languageBtn?.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.changeLanguage(lang);
                dropdown.classList.add('hidden');
            });
        });

        document.addEventListener('click', (e) => {
            if (!languageBtn?.contains(e.target) && !dropdown?.contains(e.target)) {
                dropdown?.classList.add('hidden');
            }
        });
    }

    changeLanguage(lang) {
        console.log(`Changing language to: ${lang}`);
        // Language switching implementation would go here
    }

    saveSession() {
        const sessionData = {
            selectedStationCount: this.selectedStationCount,
            selectedStations: this.selectedStations,
            customNames: this.customNames,
            lineColors: this.lineColors
        };
        
        try {
            sessionStorage.setItem('zvv-board-session', JSON.stringify(sessionData));
            console.log('Session saved:', sessionData);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    restoreSession() {
        try {
            const sessionData = sessionStorage.getItem('zvv-board-session');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                console.log('Restoring session:', data);
                
                this.selectedStationCount = data.selectedStationCount || 0;
                this.selectedStations = data.selectedStations || [];
                this.customNames = data.customNames || {};
                this.lineColors = { ...this.lineColors, ...data.lineColors };
                
                if (this.selectedStationCount > 0) {
                    this.selectStationCount(this.selectedStationCount);
                    
                    // Restore selected stations
                    setTimeout(() => {
                        this.selectedStations.forEach((station, index) => {
                            if (station && station.id) {
                                const input = document.getElementById(`station-${index}`);
                                if (input) {
                                    input.value = station.name;
                                    input.dataset.stationId = station.id;
                                }
                            }
                        });
                        this.updateStartButton();
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error);
        }
    }

    clearSession() {
        try {
            sessionStorage.removeItem('zvv-board-session');
            console.log('Session cleared');
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ZVV Departure Board');
    new ZVVDepartureBoard();
});
