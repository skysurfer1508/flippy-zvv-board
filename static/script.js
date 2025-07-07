// Dual Station ZVV Departure Board JavaScript with LocalStorage and Individual Line Customization

class DualStationBoard {
    constructor() {
        this.selectedStations = {
            station1: null,
            station2: null
        };
        this.customNames = {
            station1: '',
            station2: ''
        };
        this.customColors = {
            tram: '#4ecdc4',
            bus: '#ff6b6b',
            train: '#ffd700'
        };
        this.individualLineColors = {}; // Store individual line colors
        this.updateIntervals = [];
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.setupAutoComplete();
        this.applyCustomColors();
        
        // Auto-start if we have saved data - go directly to monitoring
        if (this.selectedStations.station1 && this.selectedStations.station2) {
            this.startMonitoring();
        }
    }

    setupEventListeners() {
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

        // Input validation
        const inputs = ['station1-input', 'station2-input'];
        inputs.forEach(inputId => {
            document.getElementById(inputId).addEventListener('input', () => {
                this.validateInputs();
            });
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
    }

    loadFromStorage() {
        const saved = localStorage.getItem('zvv-board-config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.selectedStations = config.selectedStations || { station1: null, station2: null };
                this.customNames = config.customNames || { station1: '', station2: '' };
                this.customColors = config.customColors || { tram: '#4ecdc4', bus: '#ff6b6b', train: '#ffd700' };
                this.individualLineColors = config.individualLineColors || {};
                
                // Restore input values
                if (this.selectedStations.station1) {
                    document.getElementById('station1-input').value = this.selectedStations.station1.name;
                }
                if (this.selectedStations.station2) {
                    document.getElementById('station2-input').value = this.selectedStations.station2.name;
                }
                
                // Set color inputs
                document.getElementById('tram-color').value = this.customColors.tram;
                document.getElementById('bus-color').value = this.customColors.bus;
                document.getElementById('train-color').value = this.customColors.train;
                
                // Set custom name inputs
                document.getElementById('custom-name1').value = this.customNames.station1;
                document.getElementById('custom-name2').value = this.customNames.station2;
                
                console.log('Loaded configuration from storage');
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }

    saveToStorage() {
        const config = {
            selectedStations: this.selectedStations,
            customNames: this.customNames,
            customColors: this.customColors,
            individualLineColors: this.individualLineColors
        };
        localStorage.setItem('zvv-board-config', JSON.stringify(config));
        console.log('Configuration saved to storage');
    }

    setupAutoComplete() {
        this.setupAutoCompleteForInput('station1-input', 'suggestions1', 'station1');
        this.setupAutoCompleteForInput('station2-input', 'suggestions2', 'station2');
    }

    setupAutoCompleteForInput(inputId, suggestionsId, stationKey) {
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        let currentTimeout;

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
        const isValid = this.selectedStations.station1 && this.selectedStations.station2;
        startBtn.disabled = !isValid;
    }

    showCustomizationPhase() {
        // Hide selection phase
        document.getElementById('station-selection').classList.add('hidden');
        
        // Show customization phase
        document.getElementById('station-customization').classList.remove('hidden');
        
        // Pre-fill custom names with station names if empty
        if (!this.customNames.station1) {
            document.getElementById('custom-name1').value = this.selectedStations.station1.name;
        }
        if (!this.customNames.station2) {
            document.getElementById('custom-name2').value = this.selectedStations.station2.name;
        }
        
        this.saveToStorage();
    }

    applyCustomization() {
        // Get custom names
        this.customNames.station1 = document.getElementById('custom-name1').value || this.selectedStations.station1.name;
        this.customNames.station2 = document.getElementById('custom-name2').value || this.selectedStations.station2.name;
        
        this.saveToStorage();
        this.startMonitoring();
    }

    startMonitoring() {
        // Hide selection and customization phases
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        
        // Show dual boards
        document.getElementById('dual-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');

        // Set custom station names
        document.getElementById('station1-name').textContent = this.customNames.station1 || this.selectedStations.station1.name;
        document.getElementById('station2-name').textContent = this.customNames.station2 || this.selectedStations.station2.name;

        // Start fetching data for both stations
        this.fetchDeparturesForStation(this.selectedStations.station1.id, 'departures1', 'station1-updated');
        this.fetchDeparturesForStation(this.selectedStations.station2.id, 'departures2', 'station2-updated');

        // Clear existing intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Set up intervals for auto-refresh
        this.updateIntervals.push(
            setInterval(() => {
                this.fetchDeparturesForStation(this.selectedStations.station1.id, 'departures1', 'station1-updated');
            }, 25000)
        );

        this.updateIntervals.push(
            setInterval(() => {
                this.fetchDeparturesForStation(this.selectedStations.station2.id, 'departures2', 'station2-updated');
            }, 25000)
        );
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
                         onclick="board.changeLineColor('${dep.line}', '${dep.category}')"
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

    getLineColor(lineNumber, category) {
        // Check if there's an individual color set for this line
        if (this.individualLineColors[lineNumber]) {
            return this.individualLineColors[lineNumber];
        }
        
        // Otherwise use category default color
        return this.getCustomColor(category);
    }

    changeLineColor(lineNumber, category) {
        // Create a color input dynamically
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = this.individualLineColors[lineNumber] || this.getCustomColor(category);
        
        colorInput.onchange = (e) => {
            this.individualLineColors[lineNumber] = e.target.value;
            this.saveToStorage();
            // Refresh the display
            this.fetchDeparturesForStation(this.selectedStations.station1.id, 'departures1', 'station1-updated');
            this.fetchDeparturesForStation(this.selectedStations.station2.id, 'departures2', 'station2-updated');
        };
        
        colorInput.click();
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

    resetToSelection() {
        // Clear intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals = [];

        // Clear stored data
        localStorage.removeItem('zvv-board-config');
        this.selectedStations = { station1: null, station2: null };
        this.customNames = { station1: '', station2: '' };
        this.individualLineColors = {};

        // Clear inputs
        document.getElementById('station1-input').value = '';
        document.getElementById('station2-input').value = '';
        document.getElementById('custom-name1').value = '';
        document.getElementById('custom-name2').value = '';

        // Hide boards and customization, show selection
        document.getElementById('dual-boards').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
        
        // Reset validation
        this.validateInputs();
    }
}

// Global reference for onclick handlers
let board;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    board = new DualStationBoard();
});
