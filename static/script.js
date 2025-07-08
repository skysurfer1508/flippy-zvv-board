// Enhanced Dual Station ZVV Departure Board JavaScript with Station Count Selection

class DualStationBoard {
    constructor() {
        this.stationCount = 2; // Default to 2 stations
        this.selectedStations = {};
        this.customNames = {};
        this.customColors = {
            tram: '#4ecdc4',
            bus: '#ff6b6b',
            train: '#ffd700'
        };
        this.individualLineColors = {}; // Store individual line colors
        this.updateIntervals = [];
        this.currentLineForColor = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        
        // Check if we should auto-start based on saved data
        if (this.hasAllStationsSelected()) {
            this.startMonitoring();
        } else if (this.stationCount > 0) {
            this.showStationSelection();
        }
    }

    hasAllStationsSelected() {
        for (let i = 1; i <= this.stationCount; i++) {
            if (!this.selectedStations[`station${i}`]) {
                return false;
            }
        }
        return true;
    }

    setupEventListeners() {
        // Station count selection
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectStationCount(parseInt(e.target.dataset.count));
            });
        });

        // Station selection
        document.getElementById('start-monitoring').addEventListener('click', () => {
            this.showCustomizationPhase();
        });

        // Apply customization
        document.getElementById('apply-customization').addEventListener('click', () => {
            this.applyCustomization();
        });

        // Change stations button
        document.getElementById('change-stations').addEventListener('click', () => {
            this.resetToSelection();
        });

        // Color inputs
        ['tram-color', 'bus-color', 'train-color'].forEach(colorId => {
            document.getElementById(colorId).addEventListener('change', (e) => {
                const type = colorId.replace('-color', '');
                this.customColors[type] = e.target.value;
                this.saveToStorage();
                this.applyCustomColors();
            });
        });

        // Color picker modal
        document.getElementById('color-modal-apply').addEventListener('click', () => {
            this.applyLineColor();
        });

        document.getElementById('color-modal-cancel').addEventListener('click', () => {
            this.closeColorModal();
        });

        // Close modal on background click
        document.getElementById('color-picker-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('color-picker-modal')) {
                this.closeColorModal();
            }
        });
    }

    selectStationCount(count) {
        this.stationCount = count;
        
        // Update button styles
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-count="${count}"]`).classList.add('selected');
        
        // Clear existing station data if count changed
        this.selectedStations = {};
        this.customNames = {};
        
        this.saveToStorage();
        this.showStationSelection();
    }

    showStationSelection() {
        // Hide count selection
        document.getElementById('station-count-selection').classList.add('hidden');
        
        // Show station selection
        document.getElementById('station-selection').classList.remove('hidden');
        
        // Generate input fields based on station count
        this.generateStationInputs();
        this.setupAutoComplete();
    }

    generateStationInputs() {
        const container = document.querySelector('.dynamic-input-container');
        container.innerHTML = '';
        
        // Adjust grid columns based on count
        if (this.stationCount <= 2) {
            container.style.gridTemplateColumns = `repeat(${this.stationCount}, 1fr)`;
        } else {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        
        for (let i = 1; i <= this.stationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';
            inputGroup.innerHTML = `
                <label for="station${i}-input">Station ${i}</label>
                <div class="search-container">
                    <input type="text" id="station${i}-input" placeholder="Station ${i} eingeben..." autocomplete="off">
                    <div id="suggestions${i}" class="suggestions"></div>
                </div>
            `;
            container.appendChild(inputGroup);
        }
        
        // Add start button
        const startButton = document.createElement('button');
        startButton.id = 'start-monitoring';
        startButton.className = 'start-btn';
        startButton.disabled = true;
        startButton.textContent = 'Abfahrtszeiten anzeigen';
        container.parentNode.appendChild(startButton);
        
        // Re-attach event listener
        startButton.addEventListener('click', () => {
            this.showCustomizationPhase();
        });
    }

    setupAutoComplete() {
        for (let i = 1; i <= this.stationCount; i++) {
            this.setupAutoCompleteForInput(`station${i}-input`, `suggestions${i}`, `station${i}`);
        }
    }

    setupAutoCompleteForInput(inputId, suggestionsId, stationKey) {
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        if (!input || !suggestions) return;
        
        let currentTimeout;

        // Restore saved value
        if (this.selectedStations[stationKey]) {
            input.value = this.selectedStations[stationKey].name;
        }

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                suggestions.style.display = 'none';
                this.selectedStations[stationKey] = null;
                this.validateInputs();
                this.saveToStorage();
                return;
            }

            clearTimeout(currentTimeout);
            currentTimeout = setTimeout(() => {
                this.fetchStations(query, suggestions, input, stationKey);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }

    async fetchStations(query, suggestions, input, stationKey) {
        try {
            const response = await fetch(`/api/locations?query=${encodeURIComponent(query)}`);
            const stations = await response.json();

            if (stations.length === 0) {
                suggestions.style.display = 'none';
                return;
            }

            suggestions.innerHTML = '';
            stations.forEach(station => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = station.name;
                item.addEventListener('click', () => {
                    input.value = station.name;
                    this.selectedStations[stationKey] = station;
                    suggestions.style.display = 'none';
                    this.validateInputs();
                    this.saveToStorage();
                });
                suggestions.appendChild(item);
            });

            suggestions.style.display = 'block';
        } catch (error) {
            console.error('Error fetching stations:', error);
            suggestions.style.display = 'none';
        }
    }

    validateInputs() {
        const startBtn = document.getElementById('start-monitoring');
        if (!startBtn) return;
        
        const isValid = this.hasAllStationsSelected();
        startBtn.disabled = !isValid;
    }

    showCustomizationPhase() {
        // Hide selection phase
        document.getElementById('station-selection').classList.add('hidden');
        
        // Show customization phase
        document.getElementById('station-customization').classList.remove('hidden');
        
        // Generate customization inputs
        this.generateCustomizationInputs();
        this.saveToStorage();
    }

    generateCustomizationInputs() {
        const container = document.querySelector('.customization-container');
        container.innerHTML = '';
        
        // Adjust grid based on station count
        if (this.stationCount <= 2) {
            container.style.gridTemplateColumns = `repeat(${this.stationCount}, 1fr)`;
        } else {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        
        for (let i = 1; i <= this.stationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'custom-input-group';
            inputGroup.innerHTML = `
                <label for="custom-name${i}">Anzeigename für Station ${i}:</label>
                <input type="text" id="custom-name${i}" placeholder="Custom Name..." value="${this.customNames[`station${i}`] || this.selectedStations[`station${i}`]?.name || ''}">
            `;
            container.appendChild(inputGroup);
        }
    }

    applyCustomization() {
        // Get custom names
        for (let i = 1; i <= this.stationCount; i++) {
            const input = document.getElementById(`custom-name${i}`);
            if (input) {
                this.customNames[`station${i}`] = input.value || this.selectedStations[`station${i}`].name;
            }
        }
        
        this.saveToStorage();
        this.startMonitoring();
    }

    startMonitoring() {
        // Hide selection and customization phases
        document.getElementById('station-count-selection').classList.add('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        
        // Show dual boards
        document.getElementById('dual-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');

        // Generate board layout
        this.generateBoards();
        this.applyCustomColors();

        // Start fetching data for all stations
        this.startDataFetching();
    }

    generateBoards() {
        const dualBoards = document.getElementById('dual-boards');
        dualBoards.innerHTML = '';
        
        // Adjust grid layout based on station count
        if (this.stationCount === 1) {
            dualBoards.style.gridTemplateColumns = '1fr';
        } else if (this.stationCount === 2) {
            dualBoards.style.gridTemplateColumns = '1fr 1fr';
        } else if (this.stationCount === 3) {
            dualBoards.style.gridTemplateColumns = '1fr 1fr 1fr';
        } else {
            dualBoards.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        
        for (let i = 1; i <= this.stationCount; i++) {
            const boardContainer = document.createElement('div');
            boardContainer.className = 'board-container';
            boardContainer.innerHTML = `
                <div class="station-header">
                    <h2 id="station${i}-name">${this.customNames[`station${i}`] || this.selectedStations[`station${i}`].name}</h2>
                    <div class="last-updated" id="station${i}-updated">Lädt...</div>
                </div>
                <div class="departure-board">
                    <div class="board-header">
                        <div class="header-line">Linie</div>
                        <div class="header-destination">Ziel</div>
                        <div class="header-platform">Gleis</div>
                        <div class="header-time">Abfahrt</div>
                    </div>
                    <div id="departures${i}" class="departures-list">
                        <div class="no-data">Lade Abfahrtszeiten...</div>
                    </div>
                </div>
            `;
            dualBoards.appendChild(boardContainer);
        }
    }

    startDataFetching() {
        // Clear existing intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Fetch data immediately for all stations
        for (let i = 1; i <= this.stationCount; i++) {
            if (this.selectedStations[`station${i}`]) {
                this.fetchDeparturesForStation(
                    this.selectedStations[`station${i}`].id, 
                    `departures${i}`, 
                    `station${i}-updated`
                );
                
                // Set up interval for auto-refresh
                this.updateIntervals.push(
                    setInterval(() => {
                        this.fetchDeparturesForStation(
                            this.selectedStations[`station${i}`].id, 
                            `departures${i}`, 
                            `station${i}-updated`
                        );
                    }, 25000)
                );
            }
        }
    }

    async fetchDeparturesForStation(stationId, containerId, updatedId) {
        try {
            const response = await fetch(`/api/board?station=${stationId}`);
            const data = await response.json();

            if (data.error) {
                this.showError(containerId, data.error);
                return;
            }

            this.displayDepartures(data.departures, containerId);
            this.updateTimestamp(updatedId, data.updated);

        } catch (error) {
            console.error('Error fetching departures:', error);
            this.showError(containerId, 'Fehler beim Laden der Daten');
        }
    }

    displayDepartures(departures, containerId) {
        const container = document.getElementById(containerId);
        
        if (!departures || departures.length === 0) {
            container.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
            return;
        }

        const rows = departures.map(dep => {
            const departureTime = new Date(dep.departure);
            const now = new Date();
            const diffMinutes = Math.max(0, Math.floor((departureTime - now) / 60000));
            
            let timeDisplay = diffMinutes === 0 ? 'Jetzt' : `${diffMinutes}'`;
            let delayDisplay = '';
            
            if (dep.delay > 0) {
                delayDisplay = `<span class="delay">+${dep.delay}'</span>`;
            }

            const lineClass = this.getLineClass(dep.category);
            const lineColor = this.getLineColor(dep.line, dep.category);

            return `
                <div class="departure-row">
                    <div class="line-number ${lineClass}" 
                         style="background-color: ${lineColor}; cursor: pointer;" 
                         onclick="board.openColorPicker('${dep.line}', '${dep.category}')"
                         title="Klicken um Farbe zu ändern">${dep.line}</div>
                    <div class="destination">${dep.destination}</div>
                    <div class="platform">${dep.platform || '-'}</div>
                    <div class="departure-time">
                        ${timeDisplay}
                        ${delayDisplay}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = rows;
    }

    openColorPicker(lineNumber, category) {
        this.currentLineForColor = lineNumber;
        const modal = document.getElementById('color-picker-modal');
        const lineSpan = document.getElementById('color-modal-line');
        const colorInput = document.getElementById('color-modal-input');
        
        lineSpan.textContent = lineNumber;
        colorInput.value = this.individualLineColors[lineNumber] || this.getCustomColor(category);
        
        modal.classList.remove('hidden');
    }

    applyLineColor() {
        const colorInput = document.getElementById('color-modal-input');
        
        if (this.currentLineForColor) {
            this.individualLineColors[this.currentLineForColor] = colorInput.value;
            this.saveToStorage();
            
            // Refresh all displays
            for (let i = 1; i <= this.stationCount; i++) {
                if (this.selectedStations[`station${i}`]) {
                    this.fetchDeparturesForStation(
                        this.selectedStations[`station${i}`].id, 
                        `departures${i}`, 
                        `station${i}-updated`
                    );
                }
            }
        }
        
        this.closeColorModal();
    }

    closeColorModal() {
        document.getElementById('color-picker-modal').classList.add('hidden');
        this.currentLineForColor = null;
    }

    getLineColor(lineNumber, category) {
        // Check if there's an individual color set for this line
        if (this.individualLineColors[lineNumber]) {
            return this.individualLineColors[lineNumber];
        }
        
        // Otherwise use category default color
        return this.getCustomColor(category);
    }

    getLineClass(category) {
        if (!category) return '';
        
        const cat = category.toLowerCase();
        if (cat.includes('bus') || cat.includes('b')) return 'bus';
        if (cat.includes('tram') || cat.includes('t')) return 'tram';
        if (cat.includes('train') || cat.includes('ic') || cat.includes('ir') || cat.includes('re') || cat.includes('s')) return 'train';
        return '';
    }

    getCustomColor(category) {
        if (!category) return this.customColors.train;
        
        const cat = category.toLowerCase();
        if (cat.includes('bus') || cat.includes('b')) return this.customColors.bus;
        if (cat.includes('tram') || cat.includes('t')) return this.customColors.tram;
        if (cat.includes('train') || cat.includes('ic') || cat.includes('ir') || cat.includes('re') || cat.includes('s')) return this.customColors.train;
        return this.customColors.train;
    }

    applyCustomColors() {
        // Create dynamic CSS for custom colors
        let style = document.getElementById('dynamic-colors');
        if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-colors';
            document.head.appendChild(style);
        }
        
        style.textContent = `
            .line-number.tram { background-color: ${this.customColors.tram} !important; }
            .line-number.bus { background-color: ${this.customColors.bus} !important; }
            .line-number.train { background-color: ${this.customColors.train} !important; }
        `;
    }

    updateTimestamp(updatedId, timestamp) {
        const element = document.getElementById(updatedId);
        if (element && timestamp) {
            const date = new Date(timestamp);
            element.textContent = `Aktualisiert: ${date.toLocaleTimeString('de-CH')}`;
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="no-data" style="color: #ff4444;">${message}</div>`;
    }

    loadFromStorage() {
        const saved = localStorage.getItem('zvv-board-config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.stationCount = config.stationCount || 2;
                this.selectedStations = config.selectedStations || {};
                this.customNames = config.customNames || {};
                this.customColors = config.customColors || { tram: '#4ecdc4', bus: '#ff6b6b', train: '#ffd700' };
                this.individualLineColors = config.individualLineColors || {};
                
                // Set color inputs if they exist
                const tramColor = document.getElementById('tram-color');
                const busColor = document.getElementById('bus-color');
                const trainColor = document.getElementById('train-color');
                
                if (tramColor) tramColor.value = this.customColors.tram;
                if (busColor) busColor.value = this.customColors.bus;
                if (trainColor) trainColor.value = this.customColors.train;
                
                console.log('Loaded configuration from storage');
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }

    saveToStorage() {
        const config = {
            stationCount: this.stationCount,
            selectedStations: this.selectedStations,
            customNames: this.customNames,
            customColors: this.customColors,
            individualLineColors: this.individualLineColors
        };
        localStorage.setItem('zvv-board-config', JSON.stringify(config));
        console.log('Configuration saved to storage');
    }

    resetToSelection() {
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Clear stored data
        localStorage.removeItem('zvv-board-config');
        this.stationCount = 2;
        this.selectedStations = {};
        this.customNames = {};
        this.individualLineColors = {};

        // Show count selection, hide others
        document.getElementById('station-count-selection').classList.remove('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dual-boards').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        
        // Reset count button selection
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
}

// Global reference for onclick handlers
let board;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    board = new DualStationBoard();
});
