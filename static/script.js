class ZVVBoard {
    constructor() {
        this.stations = [];
        this.stationCount = 2;
        this.selectedStations = [];
        this.customNames = {};
        this.lineColors = {
            'tram': '#4ecdc4',
            'bus': '#ff6b6b',
            'train': '#ffd700'
        };
        this.currentColorPickerLine = null;
        this.refreshInterval = null;

        this.initializeApp();
    }

    initializeApp() {
        this.loadStations();
        this.setupEventListeners();
        this.showStationCountSelection();
    }

    showStationCountSelection() {
        // Hide all other phases
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dual-boards').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        
        // Show station count selection
        document.getElementById('station-count-selection').classList.remove('hidden');
    }

    setupEventListeners() {
        // Station count slider
        const slider = document.getElementById('station-count-slider');
        const display = document.getElementById('station-count-display');
        
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                display.textContent = count;
                this.stationCount = count;
            });
            
            // Set initial values
            slider.value = this.stationCount;
            display.textContent = this.stationCount;
        }

        // Station count confirmation button
        const confirmBtn = document.getElementById('confirm-station-count');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.selectStationCount(this.stationCount);
            });
        }

        // Apply customization
        const applyBtn = document.getElementById('apply-customization');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyCustomization();
            });
        }

        // Change stations button
        const changeBtn = document.getElementById('change-stations');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                this.showStationCountSelection();
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                }
            });
        }

        // Color picker modal handlers
        this.setupColorPickerModal();
    }

    selectStationCount(count) {
        this.stationCount = count;
        this.selectedStations = new Array(count).fill(null);
        
        // Hide station count selection and show station selection
        document.getElementById('station-count-selection').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
        
        // Generate dynamic input fields
        this.generateStationInputs();
    }

    generateStationInputs() {
        const container = document.querySelector('.dynamic-input-container');
        container.innerHTML = ''; // Clear existing inputs
        
        // Create input fields based on selected count
        for (let i = 0; i < this.stationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';
            
            const label = document.createElement('label');
            label.setAttribute('for', `station${i + 1}-input`);
            label.textContent = `Station ${i + 1}`;
            
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `station${i + 1}-input`;
            input.placeholder = `Station ${i + 1} eingeben...`;
            input.autocomplete = 'off';
            
            const suggestions = document.createElement('div');
            suggestions.id = `suggestions${i + 1}`;
            suggestions.className = 'suggestions';
            
            searchContainer.appendChild(input);
            searchContainer.appendChild(suggestions);
            inputGroup.appendChild(label);
            inputGroup.appendChild(searchContainer);
            container.appendChild(inputGroup);
        }
        
        // Add start button (only one)
        let startButton = document.getElementById('start-monitoring');
        if (startButton) {
            startButton.remove(); // Remove existing button if any
        }
        
        startButton = document.createElement('button');
        startButton.id = 'start-monitoring';
        startButton.className = 'start-btn';
        startButton.disabled = true;
        startButton.textContent = 'Abfahrtszeiten anzeigen';
        
        // Add to station selection container
        const stationSelection = document.getElementById('station-selection');
        stationSelection.appendChild(startButton);
        
        // Add event listener
        startButton.addEventListener('click', () => {
            this.showCustomizationPhase();
        });
        
        // Setup autocomplete for all inputs
        this.setupAutoComplete();
    }

    setupAutoComplete() {
        for (let i = 1; i <= this.stationCount; i++) {
            const input = document.getElementById(`station${i}-input`);
            const suggestions = document.getElementById(`suggestions${i}`);
            
            if (input && suggestions) {
                let currentSelection = -1;
                
                input.addEventListener('input', (e) => {
                    const query = e.target.value.trim();
                    if (query.length < 2) {
                        suggestions.style.display = 'none';
                        return;
                    }
                    
                    const results = this.searchStations(query);
                    this.displaySuggestions(results, suggestions, input, i - 1);
                    currentSelection = -1;
                });

                input.addEventListener('keydown', (e) => {
                    const items = suggestions.querySelectorAll('.suggestion-item');
                    
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        currentSelection = Math.min(currentSelection + 1, items.length - 1);
                        this.updateSelection(items, currentSelection);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        currentSelection = Math.max(currentSelection - 1, -1);
                        this.updateSelection(items, currentSelection);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (currentSelection >= 0 && items[currentSelection]) {
                            items[currentSelection].click();
                        }
                    } else if (e.key === 'Escape') {
                        suggestions.style.display = 'none';
                        currentSelection = -1;
                    }
                });

                input.addEventListener('blur', (e) => {
                    setTimeout(() => {
                        suggestions.style.display = 'none';
                    }, 150);
                });
            }
        }
    }

    async loadStations() {
        try {
            const response = await fetch('https://transport.opendata.ch/v1/locations?type=station');
            const data = await response.json();
            this.stations = data.stations || [];
        } catch (error) {
            console.error('Error loading stations:', error);
            this.stations = [];
        }
    }

    searchStations(query) {
        const normalizedQuery = query.toLowerCase();
        return this.stations
            .filter(station => 
                station.name.toLowerCase().includes(normalizedQuery)
            )
            .slice(0, 10);
    }

    displaySuggestions(stations, container, input, stationIndex) {
        container.innerHTML = '';
        
        if (stations.length === 0) {
            container.style.display = 'none';
            return;
        }

        stations.forEach(station => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = station.name;
            item.addEventListener('click', () => {
                this.selectStation(station, input, container, stationIndex);
            });
            container.appendChild(item);
        });

        container.style.display = 'block';
    }

    updateSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    selectStation(station, input, container, stationIndex) {
        input.value = station.name;
        container.style.display = 'none';
        this.selectedStations[stationIndex] = station;
        this.checkAllStationsSelected();
    }

    checkAllStationsSelected() {
        const allSelected = this.selectedStations.every(station => station !== null);
        const startButton = document.getElementById('start-monitoring');
        if (startButton) {
            startButton.disabled = !allSelected;
        }
    }

    showCustomizationPhase() {
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.remove('hidden');
        this.generateCustomizationInputs();
    }

    generateCustomizationInputs() {
        const container = document.querySelector('.customization-container');
        container.innerHTML = '';

        for (let i = 0; i < this.stationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'custom-input-group';
            
            const label = document.createElement('label');
            label.setAttribute('for', `custom-name${i + 1}`);
            label.textContent = `Anzeigename für Station ${i + 1}:`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `custom-name${i + 1}`;
            input.placeholder = this.selectedStations[i]?.name || 'Custom Name...';
            input.value = this.customNames[i] || this.selectedStations[i]?.name || '';
            
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            container.appendChild(inputGroup);
        }
    }

    applyCustomization() {
        // Save custom names
        for (let i = 0; i < this.stationCount; i++) {
            const input = document.getElementById(`custom-name${i + 1}`);
            if (input && input.value.trim()) {
                this.customNames[i] = input.value.trim();
            } else {
                this.customNames[i] = this.selectedStations[i]?.name || `Station ${i + 1}`;
            }
        }

        // Save color preferences
        this.lineColors.tram = document.getElementById('tram-color').value;
        this.lineColors.bus = document.getElementById('bus-color').value;
        this.lineColors.train = document.getElementById('train-color').value;

        this.startMonitoring();
    }

    startMonitoring() {
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('dual-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');

        this.createStationBoards();
        this.fetchAllDepartures();
        
        // Refresh every 25 seconds
        this.refreshInterval = setInterval(() => {
            this.fetchAllDepartures();
        }, 25000);
    }

    createStationBoards() {
        const dualBoards = document.getElementById('dual-boards');
        dualBoards.innerHTML = '';

        for (let i = 0; i < this.stationCount; i++) {
            const boardContainer = document.createElement('div');
            boardContainer.className = 'board-container';
            
            const stationHeader = document.createElement('div');
            stationHeader.className = 'station-header';
            
            const stationName = document.createElement('h2');
            stationName.id = `station${i + 1}-name`;
            stationName.textContent = this.customNames[i] || this.selectedStations[i]?.name || `Station ${i + 1}`;
            
            const lastUpdated = document.createElement('div');
            lastUpdated.className = 'last-updated';
            lastUpdated.id = `station${i + 1}-updated`;
            lastUpdated.textContent = 'Lädt...';
            
            stationHeader.appendChild(stationName);
            stationHeader.appendChild(lastUpdated);
            
            const departureBoard = document.createElement('div');
            departureBoard.className = 'departure-board';
            
            const boardHeader = document.createElement('div');
            boardHeader.className = 'board-header';
            boardHeader.innerHTML = `
                <div class="header-line">Linie</div>
                <div class="header-destination">Ziel</div>
                <div class="header-platform">Gleis</div>
                <div class="header-time">Abfahrt</div>
            `;
            
            const departuresList = document.createElement('div');
            departuresList.id = `departures${i + 1}`;
            departuresList.className = 'departures-list';
            departuresList.innerHTML = '<div class="no-data">Lade Abfahrtszeiten...</div>';
            
            departureBoard.appendChild(boardHeader);
            departureBoard.appendChild(departuresList);
            boardContainer.appendChild(stationHeader);
            boardContainer.appendChild(departureBoard);
            dualBoards.appendChild(boardContainer);
        }

        // Adjust grid layout based on station count
        if (this.stationCount === 1) {
            dualBoards.style.gridTemplateColumns = '1fr';
        } else if (this.stationCount === 2) {
            dualBoards.style.gridTemplateColumns = '1fr 1fr';
        } else if (this.stationCount <= 4) {
            dualBoards.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            dualBoards.style.gridTemplateColumns = 'repeat(3, 1fr)';
        }
    }

    async fetchAllDepartures() {
        for (let i = 0; i < this.stationCount; i++) {
            if (this.selectedStations[i]) {
                await this.fetchDepartures(this.selectedStations[i], i + 1);
            }
        }
    }

    async fetchDepartures(station, boardNumber) {
        try {
            const response = await fetch(`https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=15`);
            const data = await response.json();
            
            if (data.stationboard) {
                this.updateDepartureBoard(data.stationboard, boardNumber);
                
                const updatedElement = document.getElementById(`station${boardNumber}-updated`);
                if (updatedElement) {
                    updatedElement.textContent = `Letzte Aktualisierung: ${new Date().toLocaleTimeString('de-CH')}`;
                }
            }
        } catch (error) {
            console.error(`Error fetching departures for station ${boardNumber}:`, error);
            const departuresContainer = document.getElementById(`departures${boardNumber}`);
            if (departuresContainer) {
                departuresContainer.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
            }
        }
    }

    updateDepartureBoard(departures, boardNumber) {
        const container = document.getElementById(`departures${boardNumber}`);
        if (!container) return;

        if (!departures || departures.length === 0) {
            container.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
            return;
        }

        container.innerHTML = '';

        departures.slice(0, 12).forEach(departure => {
            const row = document.createElement('div');
            row.className = 'departure-row';

            const lineNumber = document.createElement('div');
            lineNumber.className = `line-number ${this.getLineType(departure.category || departure.name)}`;
            lineNumber.textContent = departure.number || departure.name || '?';
            lineNumber.style.backgroundColor = this.getLineColor(departure.number || departure.name);
            lineNumber.style.cursor = 'pointer';
            lineNumber.addEventListener('click', () => {
                this.showColorPicker(departure.number || departure.name);
            });

            const destination = document.createElement('div');
            destination.className = 'destination';
            destination.textContent = departure.to || 'Unbekannt';

            const platform = document.createElement('div');
            platform.className = 'platform';
            platform.textContent = departure.stop?.platform || '-';

            const departureTime = document.createElement('div');
            departureTime.className = 'departure-time';
            
            const { time, delay } = this.formatTime(departure.stop?.departure || departure.stop?.departureTimestamp);
            departureTime.innerHTML = delay ? `${time} <span class="delay">+${delay}</span>` : time;

            row.appendChild(lineNumber);
            row.appendChild(destination);
            row.appendChild(platform);
            row.appendChild(departureTime);
            container.appendChild(row);
        });
    }

    formatTime(timestamp) {
        if (!timestamp) return { time: '--:--', delay: null };
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMinutes = Math.round((date.getTime() - now.getTime()) / (1000 * 60));
        
        if (diffMinutes <= 0) {
            return { time: 'Jetzt', delay: null };
        } else if (diffMinutes < 60) {
            return { time: `${diffMinutes}'`, delay: null };
        } else {
            return { 
                time: date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }), 
                delay: null 
            };
        }
    }

    getLineType(category) {
        if (!category) return 'bus';
        const cat = category.toLowerCase();
        if (cat.includes('tram') || cat.includes('t')) return 'tram';
        if (cat.includes('bus') || cat.includes('b')) return 'bus';
        if (cat.includes('s') || cat.includes('ic') || cat.includes('ir')) return 'train';
        return 'bus';
    }

    getLineColor(lineNumber) {
        const savedColor = localStorage.getItem(`line-color-${lineNumber}`);
        if (savedColor) return savedColor;
        
        // Default colors based on line type
        if (lineNumber && lineNumber.toString().match(/^[0-9]+$/)) {
            const num = parseInt(lineNumber);
            if (num >= 1 && num <= 17) return this.lineColors.tram;
            if (num >= 20 && num <= 35) return this.lineColors.bus;
        }
        return this.lineColors.bus;
    }

    setupColorPickerModal() {
        const modal = document.getElementById('color-picker-modal');
        const applyBtn = document.getElementById('color-modal-apply');
        const cancelBtn = document.getElementById('color-modal-cancel');
        const colorInput = document.getElementById('color-modal-input');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (this.currentColorPickerLine && colorInput.value) {
                    this.applyLineColor(this.currentColorPickerLine, colorInput.value);
                    modal.classList.add('hidden');
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
    }

    showColorPicker(lineNumber) {
        this.currentColorPickerLine = lineNumber;
        const modal = document.getElementById('color-picker-modal');
        const lineSpan = document.getElementById('color-modal-line');
        const colorInput = document.getElementById('color-modal-input');

        if (lineSpan) lineSpan.textContent = lineNumber;
        if (colorInput) {
            const currentColor = this.getLineColor(lineNumber);
            colorInput.value = currentColor;
        }
        
        modal.classList.remove('hidden');
    }

    applyLineColor(lineNumber, color) {
        localStorage.setItem(`line-color-${lineNumber}`, color);
        
        // Update all visible line numbers with this color
        document.querySelectorAll('.line-number').forEach(element => {
            if (element.textContent === lineNumber) {
                element.style.backgroundColor = color;
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZVVBoard();
});
