
// Dual Station ZVV Departure Board JavaScript

class DualStationBoard {
    constructor() {
        this.selectedStations = {
            station1: null,
            station2: null
        };
        this.updateIntervals = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoComplete();
    }

    setupEventListeners() {
        // Start monitoring button
        document.getElementById('start-monitoring').addEventListener('click', () => {
            this.startMonitoring();
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

    startMonitoring() {
        // Hide selection phase
        document.getElementById('station-selection').classList.add('hidden');
        
        // Show dual boards
        document.getElementById('dual-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');

        // Set station names
        document.getElementById('station1-name').textContent = this.selectedStations.station1.name;
        document.getElementById('station2-name').textContent = this.selectedStations.station2.name;

        // Start fetching data for both stations
        this.fetchDeparturesForStation(this.selectedStations.station1.id, 'departures1', 'station1-updated');
        this.fetchDeparturesForStation(this.selectedStations.station2.id, 'departures2', 'station2-updated');

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

            return `
                <div class="departure-row">
                    <div class="line-number ${lineClass}">${dep.line}</div>
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

    getLineClass(category) {
        if (!category) return '';
        
        const cat = category.toLowerCase();
        if (cat.includes('bus') || cat.includes('b')) return 'bus';
        if (cat.includes('tram') || cat.includes('t')) return 'tram';
        return '';
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

        // Reset selections
        this.selectedStations = { station1: null, station2: null };
        
        // Clear inputs
        document.getElementById('station1-input').value = '';
        document.getElementById('station2-input').value = '';
        
        // Hide boards and show selection
        document.getElementById('dual-boards').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
        
        // Reset validation
        this.validateInputs();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DualStationBoard();
});
