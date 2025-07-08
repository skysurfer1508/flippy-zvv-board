
// ZVV App State Management
class ZVVApp {
    constructor() {
        this.selectedStationCount = 0;
        this.stations = [];
        this.currentPhase = 'count-selection';
        this.translations = {
            de: {
                title: 'ZVV Abfahrtszeiten',
                stationCountQuestion: 'Wie viele Stationen möchten Sie anzeigen?',
                stationCustomization: 'Stationen anpassen',
                lineColors: 'Linien-Farben anpassen',
                tramColor: 'Tram-Farbe:',
                busColor: 'Bus-Farbe:',
                trainColor: 'Zug-Farbe:',
                startDisplay: 'Anzeige starten',
                changeStations: 'Stationen ändern',
                loading: 'Lade Abfahrtszeiten...',
                footerText: 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
                line: 'Linie',
                destination: 'Ziel',
                platform: 'Gleis',
                departure: 'Abfahrt',
                noData: 'Keine Abfahrtszeiten verfügbar',
                colorPickerTitle: 'Farbe für Linie',
                apply: 'Übernehmen',
                cancel: 'Abbrechen',
                minutes: 'Min',
                now: 'Jetzt',
                delay: 'Verspätung'
            },
            en: {
                title: 'ZVV Departure Times',
                stationCountQuestion: 'How many stations would you like to display?',
                stationCustomization: 'Customize Stations',
                lineColors: 'Customize Line Colors',
                tramColor: 'Tram Color:',
                busColor: 'Bus Color:',
                trainColor: 'Train Color:',
                startDisplay: 'Start Display',
                changeStations: 'Change Stations',
                loading: 'Loading departure times...',
                footerText: 'Data from transport.opendata.ch | Updates every 25 seconds',
                line: 'Line',
                destination: 'Destination',
                platform: 'Platform',
                departure: 'Departure',
                noData: 'No departure times available',
                colorPickerTitle: 'Choose color for line',
                apply: 'Apply',
                cancel: 'Cancel',
                minutes: 'Min',
                now: 'Now',
                delay: 'Delay'
            }
        };
        this.currentLanguage = 'de';
        this.lineColors = {
            tram: '#4ecdc4',
            bus: '#ff6b6b',
            train: '#ffd700'
        };
        this.customLineColors = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateLanguage();
    }

    setupEventListeners() {
        // Station count selection
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectStationCount(parseInt(e.target.dataset.count));
            });
        });

        // Language selector
        const languageBtn = document.getElementById('language-selector');
        const languageDropdown = document.getElementById('language-dropdown');
        
        languageBtn.addEventListener('click', () => {
            languageDropdown.classList.toggle('hidden');
        });

        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.changeLanguage(e.target.dataset.lang);
                languageDropdown.classList.add('hidden');
            });
        });

        // Close language dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.add('hidden');
            }
        });

        // Change stations button
        document.getElementById('change-stations').addEventListener('click', () => {
            this.resetToCountSelection();
        });

        // Apply customization button
        document.getElementById('apply-customization').addEventListener('click', () => {
            this.startDisplay();
        });

        // Color picker modal
        this.setupColorPickerModal();
    }

    selectStationCount(count) {
        this.selectedStationCount = count;
        
        // Update button selection
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-count="${count}"]`).classList.add('selected');

        // Proceed to station selection after a short delay
        setTimeout(() => {
            this.showStationSelection();
        }, 300);
    }

    showStationSelection() {
        document.getElementById('station-count-selection').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
        
        this.generateStationInputs();
        this.currentPhase = 'station-selection';
    }

    generateStationInputs() {
        const container = document.querySelector('.dynamic-input-container');
        container.innerHTML = '';

        // Adjust grid layout based on station count
        if (this.selectedStationCount <= 2) {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else if (this.selectedStationCount <= 4) {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            container.style.gridTemplateColumns = 'repeat(3, 1fr)';
        }

        for (let i = 1; i <= this.selectedStationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';
            inputGroup.innerHTML = `
                <label for="station-${i}">Station ${i}:</label>
                <div class="search-container">
                    <input type="text" id="station-${i}" placeholder="Station eingeben..." autocomplete="off">
                    <div class="suggestions" id="suggestions-${i}"></div>
                </div>
            `;
            container.appendChild(inputGroup);

            // Add search functionality
            this.setupStationSearch(i);
        }

        // Add proceed button
        const proceedBtn = document.createElement('button');
        proceedBtn.className = 'start-btn';
        proceedBtn.textContent = 'Weiter zur Anpassung';
        proceedBtn.style.gridColumn = '1 / -1';
        proceedBtn.style.marginTop = '20px';
        proceedBtn.addEventListener('click', () => {
            if (this.validateStations()) {
                this.showCustomization();
            }
        });
        container.appendChild(proceedBtn);
    }

    setupStationSearch(stationIndex) {
        const input = document.getElementById(`station-${stationIndex}`);
        const suggestions = document.getElementById(`suggestions-${stationIndex}`);
        let selectedIndex = -1;

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                suggestions.style.display = 'none';
                return;
            }

            try {
                const response = await fetch(`http://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`);
                const data = await response.json();
                
                suggestions.innerHTML = '';
                selectedIndex = -1;
                
                if (data.stations && data.stations.length > 0) {
                    data.stations.slice(0, 8).forEach((station, index) => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.textContent = station.name;
                        item.addEventListener('click', () => {
                            input.value = station.name;
                            input.dataset.stationId = station.id;
                            suggestions.style.display = 'none';
                        });
                        suggestions.appendChild(item);
                    });
                    suggestions.style.display = 'block';
                } else {
                    suggestions.style.display = 'none';
                }
            } catch (error) {
                console.error('Error fetching stations:', error);
                suggestions.style.display = 'none';
            }
        });

        input.addEventListener('keydown', (e) => {
            const items = suggestions.querySelectorAll('.suggestion-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0) {
                    items[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                suggestions.style.display = 'none';
                selectedIndex = -1;
            }
        });

        function updateSelection() {
            const items = suggestions.querySelectorAll('.suggestion-item');
            items.forEach((item, index) => {
                item.classList.toggle('selected', index === selectedIndex);
            });
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }

    validateStations() {
        const stations = [];
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const input = document.getElementById(`station-${i}`);
            if (!input.value.trim()) {
                alert(`Bitte geben Sie eine Station für Eingabe ${i} ein.`);
                return false;
            }
            stations.push({
                name: input.value.trim(),
                id: input.dataset.stationId || input.value.trim()
            });
        }
        this.stations = stations;
        return true;
    }

    showCustomization() {
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.remove('hidden');
        
        this.generateCustomizationInputs();
        this.currentPhase = 'customization';
    }

    generateCustomizationInputs() {
        const container = document.querySelector('.customization-container');
        container.innerHTML = '';

        // Adjust grid layout
        if (this.selectedStationCount <= 2) {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }

        this.stations.forEach((station, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'custom-input-group';
            inputGroup.innerHTML = `
                <label for="custom-station-${index + 1}">Station ${index + 1} Anzeigename:</label>
                <input type="text" id="custom-station-${index + 1}" value="${station.name}" placeholder="Anzeigename...">
            `;
            container.appendChild(inputGroup);
        });
    }

    startDisplay() {
        // Update station names with custom names
        this.stations.forEach((station, index) => {
            const customInput = document.getElementById(`custom-station-${index + 1}`);
            if (customInput && customInput.value.trim()) {
                station.displayName = customInput.value.trim();
            } else {
                station.displayName = station.name;
            }
        });

        // Update line colors
        this.lineColors.tram = document.getElementById('tram-color').value;
        this.lineColors.bus = document.getElementById('bus-color').value;
        this.lineColors.train = document.getElementById('train-color').value;

        // Hide customization and show boards
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dynamic-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');
        
        this.generateDynamicBoards();
        this.startDataFetching();
        this.currentPhase = 'display';
    }

    generateDynamicBoards() {
        const boardsContainer = document.getElementById('dynamic-boards');
        boardsContainer.innerHTML = '';
        boardsContainer.className = `dynamic-boards stations-${this.selectedStationCount}`;

        this.stations.forEach((station, index) => {
            const boardContainer = document.createElement('div');
            boardContainer.className = 'board-container';
            boardContainer.innerHTML = `
                <div class="station-header">
                    <h2>${station.displayName}</h2>
                    <div class="last-updated" id="last-updated-${index}">Wird geladen...</div>
                </div>
                <div class="departure-board">
                    <div class="board-header">
                        <div class="header-line">${this.translations[this.currentLanguage].line}</div>
                        <div class="header-destination">${this.translations[this.currentLanguage].destination}</div>
                        <div class="header-platform">${this.translations[this.currentLanguage].platform}</div>
                        <div class="header-departure">${this.translations[this.currentLanguage].departure}</div>
                    </div>
                    <div class="departures-list" id="departures-${index}">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>${this.translations[this.currentLanguage].loading}</p>
                        </div>
                    </div>
                </div>
            `;
            boardsContainer.appendChild(boardContainer);
        });
    }

    async startDataFetching() {
        // Initial fetch
        await this.fetchAllDepartures();
        
        // Set up interval for regular updates
        this.dataInterval = setInterval(() => {
            this.fetchAllDepartures();
        }, 25000); // Every 25 seconds
    }

    async fetchAllDepartures() {
        const promises = this.stations.map((station, index) => 
            this.fetchDepartures(station, index)
        );
        
        await Promise.all(promises);
    }

    async fetchDepartures(station, index) {
        try {
            const response = await fetch(`http://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=10`);
            const data = await response.json();
            
            this.updateDepartureBoard(data, index);
            
            // Update last updated time
            const lastUpdated = document.getElementById(`last-updated-${index}`);
            if (lastUpdated) {
                lastUpdated.textContent = `Aktualisiert: ${new Date().toLocaleTimeString('de-CH')}`;
            }
        } catch (error) {
            console.error(`Error fetching departures for ${station.name}:`, error);
            this.showError(index);
        }
    }

    updateDepartureBoard(data, stationIndex) {
        const departuresList = document.getElementById(`departures-${stationIndex}`);
        if (!departuresList) return;

        departuresList.innerHTML = '';

        if (!data.stationboard || data.stationboard.length === 0) {
            departuresList.innerHTML = `<div class="no-data">${this.translations[this.currentLanguage].noData}</div>`;
            return;
        }

        data.stationboard.forEach(departure => {
            const row = document.createElement('div');
            row.className = 'departure-row';
            
            const lineNumber = departure.number || departure.name || '';
            const destination = departure.to || '';
            const platform = departure.platform || '';
            
            // Calculate departure time
            const departureTime = new Date(departure.stop.departure);
            const now = new Date();
            const diffMinutes = Math.round((departureTime - now) / (1000 * 60));
            
            let timeDisplay = '';
            let delayDisplay = '';
            
            if (diffMinutes <= 0) {
                timeDisplay = this.translations[this.currentLanguage].now;
            } else if (diffMinutes < 60) {
                timeDisplay = `${diffMinutes} ${this.translations[this.currentLanguage].minutes}`;
            } else {
                timeDisplay = departureTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
            }
            
            // Handle delays
            if (departure.stop.delay) {
                const delay = Math.round(departure.stop.delay / 60);
                if (delay > 0) {
                    delayDisplay = `<span class="delay">+${delay} ${this.translations[this.currentLanguage].minutes}</span>`;
                }
            }
            
            // Determine line type and color
            let lineClass = '';
            let backgroundColor = this.lineColors.train;
            
            if (departure.category) {
                const category = departure.category.toLowerCase();
                if (category.includes('tram') || category.includes('t')) {
                    lineClass = 'tram';
                    backgroundColor = this.lineColors.tram;
                } else if (category.includes('bus') || category.includes('b')) {
                    lineClass = 'bus';
                    backgroundColor = this.lineColors.bus;
                }
            }
            
            // Check for custom line colors
            const lineKey = `${lineNumber}`;
            if (this.customLineColors[lineKey]) {
                backgroundColor = this.customLineColors[lineKey];
            }
            
            row.innerHTML = `
                <div class="line-number ${lineClass}" style="background-color: ${backgroundColor}; cursor: pointer;" onclick="app.openColorPicker('${lineKey}', '${backgroundColor}')">${lineNumber}</div>
                <div class="destination">${destination}</div>
                <div class="platform">${platform}</div>
                <div class="departure-time">${timeDisplay} ${delayDisplay}</div>
            `;
            
            departuresList.appendChild(row);
        });
    }

    showError(stationIndex) {
        const departuresList = document.getElementById(`departures-${stationIndex}`);
        if (departuresList) {
            departuresList.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
        }
    }

    setupColorPickerModal() {
        const modal = document.getElementById('color-picker-modal');
        const applyBtn = document.getElementById('color-modal-apply');
        const cancelBtn = document.getElementById('color-modal-cancel');
        const colorInput = document.getElementById('color-modal-input');
        
        applyBtn.addEventListener('click', () => {
            const lineNumber = modal.dataset.lineNumber;
            const newColor = colorInput.value;
            
            if (lineNumber && newColor) {
                this.customLineColors[lineNumber] = newColor;
                this.updateLineColors();
                this.closeColorPicker();
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            this.closeColorPicker();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeColorPicker();
            }
        });
    }

    openColorPicker(lineNumber, currentColor) {
        const modal = document.getElementById('color-picker-modal');
        const colorInput = document.getElementById('color-modal-input');
        const lineSpan = document.getElementById('color-modal-line');
        
        modal.dataset.lineNumber = lineNumber;
        colorInput.value = currentColor;
        lineSpan.textContent = lineNumber;
        
        modal.classList.remove('hidden');
    }

    closeColorPicker() {
        document.getElementById('color-picker-modal').classList.add('hidden');
    }

    updateLineColors() {
        // Re-fetch and update all boards to apply new colors
        if (this.currentPhase === 'display') {
            this.fetchAllDepartures();
        }
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.updateLanguage();
        document.getElementById('language-selector').textContent = `🌐 ${lang.toUpperCase()}`;
    }

    updateLanguage() {
        const t = this.translations[this.currentLanguage];
        
        // Update static texts
        document.querySelector('h1').textContent = t.title;
        document.querySelector('.station-count-selection h2').textContent = t.stationCountQuestion;
        document.querySelector('.station-customization h2').textContent = t.stationCustomization;
        document.querySelector('.color-customization h3').textContent = t.lineColors;
        document.querySelector('label[for="tram-color"]').textContent = t.tramColor;
        document.querySelector('label[for="bus-color"]').textContent = t.busColor;
        document.querySelector('label[for="train-color"]').textContent = t.trainColor;
        document.getElementById('apply-customization').textContent = t.startDisplay;
        document.getElementById('change-stations').textContent = t.changeStations;
        document.querySelector('footer p').textContent = t.footerText;
        
        // Update color picker modal
        document.getElementById('color-modal-apply').textContent = t.apply;
        document.getElementById('color-modal-cancel').textContent = t.cancel;
        
        // Update board headers if they exist
        document.querySelectorAll('.header-line').forEach(el => el.textContent = t.line);
        document.querySelectorAll('.header-destination').forEach(el => el.textContent = t.destination);
        document.querySelectorAll('.header-platform').forEach(el => el.textContent = t.platform);
        document.querySelectorAll('.header-departure').forEach(el => el.textContent = t.departure);
    }

    resetToCountSelection() {
        // Clear any existing intervals
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
        }
        
        // Reset state
        this.selectedStationCount = 0;
        this.stations = [];
        this.customLineColors = {};
        this.currentPhase = 'count-selection';
        
        // Hide all phases except count selection
        document.getElementById('station-count-selection').classList.remove('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dynamic-boards').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        
        // Reset button selections
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
}

// Initialize the app
const app = new ZVVApp();
