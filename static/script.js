
// ZVV Multi-Station Departure Board with Full Browser Compatibility
class ZVVDepartureBoard {
    constructor() {
        this.selectedStationCount = 2;
        this.selectedStations = [];
        this.stationData = [];
        this.customStationNames = {};
        this.updateInterval = null;
        this.currentLanguage = this.loadLanguage();
        this.lineColors = this.loadLineColors();
        this.selectedLineForColor = null;
        
        // Translations
        this.translations = {
            de: {
                'main-title': 'ZVV Doppel-Abfahrtszeiten',
                'select-stations-text': 'Anzahl Stationen auswählen',
                'show-departures': 'Abfahrtszeiten anzeigen',
                'customize-stations-text': 'Stationen anpassen',
                'line-colors-text': 'Linien-Farben anpassen',
                'start-display': 'Anzeige starten',
                'loading-text': 'Lade Abfahrtszeiten...',
                'footer-text': 'Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden',
                'change-stations': 'Stationen ändern',
                'tram-color-label': 'Tram-Farbe:',
                'bus-color-label': 'Bus-Farbe:',
                'train-color-label': 'Zug-Farbe:',
                'color-modal-title': 'Linienfarbe ändern',
                'color-modal-line-info': 'Linie:',
                'apply': 'Anwenden',
                'reset': 'Zurücksetzen',
                'current-language': 'DE',
                'station-placeholder': 'Station eingeben...',
                'custom-name-placeholder': 'Eigener Name...',
                'line': 'Linie',
                'destination': 'Ziel',
                'platform': 'Gleis',
                'departure': 'Abfahrt',
                'loading-departures': 'Lade Abfahrtszeiten...',
                'no-departures': 'Keine Abfahrten verfügbar',
                'last-updated': 'Letzte Aktualisierung:'
            },
            en: {
                'main-title': 'ZVV Dual Departure Times',
                'select-stations-text': 'Select Number of Stations',
                'show-departures': 'Show Departures',
                'customize-stations-text': 'Customize Stations',
                'line-colors-text': 'Customize Line Colors',
                'start-display': 'Start Display',
                'loading-text': 'Loading departure times...',
                'footer-text': 'Data from transport.opendata.ch | Updates every 25 seconds',
                'change-stations': 'Change Stations',
                'tram-color-label': 'Tram Color:',
                'bus-color-label': 'Bus Color:',
                'train-color-label': 'Train Color:',
                'color-modal-title': 'Change Line Color',
                'color-modal-line-info': 'Line:',
                'apply': 'Apply',
                'reset': 'Reset',
                'current-language': 'EN',
                'station-placeholder': 'Enter station...',
                'custom-name-placeholder': 'Custom name...',
                'line': 'Line',
                'destination': 'Destination',
                'platform': 'Platform',
                'departure': 'Departure',
                'loading-departures': 'Loading departures...',
                'no-departures': 'No departures available',
                'last-updated': 'Last updated:'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateLanguageDisplay();
        this.applyStoredLineColors();
        
        // Check if there's a stored session to restore
        this.checkStoredSession();
    }
    
    setupEventListeners() {
        // Station count selection
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectStationCount(parseInt(btn.dataset.count));
            });
        });
        
        // Start monitoring button
        const startBtn = document.getElementById('start-monitoring');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.proceedToCustomization();
            });
        }
        
        // Apply customization button
        const applyBtn = document.getElementById('apply-customization');
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startMonitoring();
            });
        }
        
        // Change stations button
        const changeBtn = document.getElementById('change-stations');
        if (changeBtn) {
            changeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetToStationSelection();
            });
        }
        
        // Language selector
        const langBtn = document.getElementById('language-btn');
        const langMenu = document.getElementById('language-menu');
        
        if (langBtn && langMenu) {
            langBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                langMenu.classList.toggle('hidden');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
                    langMenu.classList.add('hidden');
                }
            });
            
            // Language options
            document.querySelectorAll('.language-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.changeLanguage(option.dataset.lang);
                    langMenu.classList.add('hidden');
                });
            });
        }
        
        // Color modal functionality
        this.setupColorModal();
        
        // Default color inputs
        ['tram-color', 'bus-color', 'train-color'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', (e) => {
                    const type = id.split('-')[0];
                    this.updateDefaultLineColor(type, e.target.value);
                });
            }
        });
    }
    
    setupColorModal() {
        const modal = document.getElementById('color-modal');
        const closeBtn = document.getElementById('color-modal-close');
        const applyBtn = document.getElementById('apply-line-color');
        const resetBtn = document.getElementById('reset-line-color');
        const colorPicker = document.getElementById('line-color-picker');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeColorModal();
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeColorModal();
                }
            });
        }
        
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyLineColor();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetLineColor();
            });
        }
        
        // Preset color buttons
        document.querySelectorAll('.preset-color').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const color = btn.dataset.color;
                if (colorPicker) {
                    colorPicker.value = color;
                }
            });
        });
    }
    
    selectStationCount(count) {
        this.selectedStationCount = count;
        
        // Update button states
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-count="${count}"]`).classList.add('selected');
        
        // Generate station inputs
        this.generateStationInputs();
        
        // Show station selection phase
        document.getElementById('station-count-selection').classList.add('hidden');
        document.getElementById('station-selection').classList.remove('hidden');
    }
    
    generateStationInputs() {
        const container = document.getElementById('station-inputs-container');
        container.innerHTML = '';
        
        for (let i = 1; i <= this.selectedStationCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'station-input-group';
            
            inputGroup.innerHTML = `
                <label for="station${i}-input">Station ${i}</label>
                <div class="search-container">
                    <input type="text" id="station${i}-input" placeholder="${this.translate('station-placeholder')}" autocomplete="off">
                    <div id="suggestions${i}" class="suggestions"></div>
                </div>
            `;
            
            container.appendChild(inputGroup);
            
            // Setup search functionality
            this.setupStationSearch(i);
        }
        
        this.checkAllStationsSelected();
    }
    
    generateCustomizationInputs() {
        const container = document.getElementById('customization-container');
        container.innerHTML = '';
        
        this.selectedStations.forEach((station, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'custom-input-group';
            
            inputGroup.innerHTML = `
                <label for="custom-name${index + 1}">${this.translate('customize-stations-text')} ${index + 1}:</label>
                <input type="text" id="custom-name${index + 1}" placeholder="${this.translate('custom-name-placeholder')}" value="${station.name}">
            `;
            
            container.appendChild(inputGroup);
        });
    }
    
    setupStationSearch(stationIndex) {
        const input = document.getElementById(`station${stationIndex}-input`);
        const suggestions = document.getElementById(`suggestions${stationIndex}`);
        let debounceTimer;
        
        if (!input || !suggestions) return;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchStations(e.target.value, suggestions, input, stationIndex);
            }, 300);
        });
        
        input.addEventListener('focus', () => {
            if (input.value.length >= 2) {
                this.searchStations(input.value, suggestions, input, stationIndex);
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }
    
    async searchStations(query, suggestionsContainer, input, stationIndex) {
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`);
            const data = await response.json();
            
            this.displaySuggestions(data.stations || [], suggestionsContainer, input, stationIndex);
        } catch (error) {
            console.error('Error fetching stations:', error);
            suggestionsContainer.style.display = 'none';
        }
    }
    
    displaySuggestions(stations, container, input, stationIndex) {
        if (stations.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        container.style.display = 'block';
        
        stations.slice(0, 8).forEach((station, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = station.name;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectStation(station, input, container, stationIndex);
            });
            
            container.appendChild(item);
        });
    }
    
    selectStation(station, input, container, stationIndex) {
        input.value = station.name;
        container.style.display = 'none';
        
        // Update selected stations array
        this.selectedStations[stationIndex - 1] = {
            name: station.name,
            id: station.id,
            coordinate: station.coordinate
        };
        
        this.checkAllStationsSelected();
    }
    
    checkAllStationsSelected() {
        const allSelected = this.selectedStations.length === this.selectedStationCount &&
                           this.selectedStations.every(station => station && station.id);
        
        const startBtn = document.getElementById('start-monitoring');
        if (startBtn) {
            startBtn.disabled = !allSelected;
        }
    }
    
    proceedToCustomization() {
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.remove('hidden');
        
        this.generateCustomizationInputs();
    }
    
    startMonitoring() {
        // Get custom names
        this.selectedStations.forEach((station, index) => {
            const customInput = document.getElementById(`custom-name${index + 1}`);
            if (customInput && customInput.value.trim()) {
                this.customStationNames[station.id] = customInput.value.trim();
            }
        });
        
        // Hide customization, show boards
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('multi-boards').classList.remove('hidden');
        document.getElementById('change-stations').classList.remove('hidden');
        
        // Generate board containers
        this.generateBoardContainers();
        
        // Start fetching data
        this.fetchAllDepartures();
        this.updateInterval = setInterval(() => {
            this.fetchAllDepartures();
        }, 25000);
        
        // Save session
        this.saveSession();
    }
    
    generateBoardContainers() {
        const container = document.getElementById('multi-boards');
        container.innerHTML = '';
        
        this.selectedStations.forEach((station, index) => {
            const displayName = this.customStationNames[station.id] || station.name;
            
            const boardContainer = document.createElement('div');
            boardContainer.className = 'board-container';
            boardContainer.innerHTML = `
                <div class="station-header">
                    <h2 id="station${index + 1}-name">${displayName}</h2>
                    <div class="last-updated" id="station${index + 1}-updated">${this.translate('loading-text')}</div>
                </div>
                <div class="departure-board">
                    <div class="board-header">
                        <div class="header-line">${this.translate('line')}</div>
                        <div class="header-destination">${this.translate('destination')}</div>
                        <div class="header-platform">${this.translate('platform')}</div>
                        <div class="header-time">${this.translate('departure')}</div>
                    </div>
                    <div id="departures${index + 1}" class="departures-list">
                        <div class="no-data">${this.translate('loading-departures')}</div>
                    </div>
                </div>
            `;
            
            container.appendChild(boardContainer);
        });
    }
    
    async fetchAllDepartures() {
        const promises = this.selectedStations.map((station, index) => 
            this.fetchDepartures(station, index + 1)
        );
        
        await Promise.all(promises);
    }
    
    async fetchDepartures(station, boardIndex) {
        try {
            const response = await fetch(
                `https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(station.name)}&limit=15`
            );
            const data = await response.json();
            
            if (data.stationboard) {
                this.displayDepartures(data.stationboard, boardIndex, station.name);
            }
        } catch (error) {
            console.error(`Error fetching departures for ${station.name}:`, error);
            this.displayError(boardIndex);
        }
    }
    
    displayDepartures(departures, boardIndex, stationName) {
        const container = document.getElementById(`departures${boardIndex}`);
        const updatedElement = document.getElementById(`station${boardIndex}-updated`);
        
        if (!container) return;
        
        if (!departures || departures.length === 0) {
            container.innerHTML = `<div class="no-data">${this.translate('no-departures')}</div>`;
            return;
        }
        
        container.innerHTML = '';
        
        departures.forEach(departure => {
            const row = document.createElement('div');
            row.className = 'departure-row';
            
            const lineNumber = departure.number || departure.name || 'N/A';
            const destination = departure.to || 'Unknown';
            const platform = departure.stop?.platform || '-';
            
            // Calculate departure time and delay
            const departureTime = new Date(departure.stop?.departureTimestamp * 1000);
            const now = new Date();
            const minutesUntil = Math.round((departureTime - now) / (1000 * 60));
            
            let timeDisplay;
            if (minutesUntil <= 0) {
                timeDisplay = '0\'';
            } else if (minutesUntil < 60) {
                timeDisplay = `${minutesUntil}'`;
            } else {
                timeDisplay = departureTime.toLocaleTimeString('de-CH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            // Handle delays
            let delayDisplay = '';
            if (departure.stop?.delay) {
                const delayMinutes = Math.round(departure.stop.delay / 60);
                if (delayMinutes > 0) {
                    delayDisplay = `<span class="delay">+${delayMinutes}'</span>`;
                }
            }
            
            // Determine line type and color
            const lineType = this.getLineType(departure);
            const lineColor = this.getLineColor(lineNumber, lineType);
            
            row.innerHTML = `
                <div class="line-number ${lineType}" style="background-color: ${lineColor};" data-line="${lineNumber}" data-type="${lineType}">
                    ${lineNumber}
                </div>
                <div class="destination" title="${destination}">
                    ${destination}
                </div>
                <div class="platform">
                    ${platform}
                </div>
                <div class="departure-time">
                    ${timeDisplay}
                    ${delayDisplay}
                </div>
            `;
            
            // Add click listener to line number
            const lineElement = row.querySelector('.line-number');
            if (lineElement) {
                lineElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openColorModal(lineNumber, lineType, lineColor);
                });
            }
            
            container.appendChild(row);
        });
        
        // Update timestamp
        if (updatedElement) {
            const now = new Date();
            updatedElement.textContent = `${this.translate('last-updated')} ${now.toLocaleTimeString('de-CH')}`;
        }
    }
    
    displayError(boardIndex) {
        const container = document.getElementById(`departures${boardIndex}`);
        if (container) {
            container.innerHTML = '<div class="no-data">Fehler beim Laden der Daten</div>';
        }
    }
    
    getLineType(departure) {
        const category = (departure.category || '').toLowerCase();
        const subcategory = (departure.subcategory || '').toLowerCase();
        
        if (category.includes('tram') || subcategory.includes('tram')) {
            return 'tram';
        } else if (category.includes('bus') || subcategory.includes('bus')) {
            return 'bus';
        } else {
            return 'train';
        }
    }
    
    getLineColor(lineNumber, lineType) {
        // Check for custom line color
        const customColor = this.lineColors[`${lineNumber}-${lineType}`];
        if (customColor) {
            return customColor;
        }
        
        // Default colors based on type
        switch (lineType) {
            case 'tram': return '#4ecdc4';
            case 'bus': return '#ff6b6b';
            case 'train': return '#ffd700';
            default: return '#ffd700';
        }
    }
    
    openColorModal(lineNumber, lineType, currentColor) {
        this.selectedLineForColor = { number: lineNumber, type: lineType };
        
        const modal = document.getElementById('color-modal');
        const selectedLineSpan = document.getElementById('selected-line');
        const colorPicker = document.getElementById('line-color-picker');
        
        if (selectedLineSpan) {
            selectedLineSpan.textContent = `${lineNumber} (${lineType.toUpperCase()})`;
        }
        
        if (colorPicker) {
            colorPicker.value = currentColor;
        }
        
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    closeColorModal() {
        const modal = document.getElementById('color-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.selectedLineForColor = null;
    }
    
    applyLineColor() {
        if (!this.selectedLineForColor) return;
        
        const colorPicker = document.getElementById('line-color-picker');
        if (!colorPicker) return;
        
        const newColor = colorPicker.value;
        const lineKey = `${this.selectedLineForColor.number}-${this.selectedLineForColor.type}`;
        
        // Store the color
        this.lineColors[lineKey] = newColor;
        this.saveLineColors();
        
        // Update all visible instances of this line
        document.querySelectorAll(`[data-line="${this.selectedLineForColor.number}"][data-type="${this.selectedLineForColor.type}"]`).forEach(element => {
            element.style.backgroundColor = newColor;
        });
        
        this.closeColorModal();
    }
    
    resetLineColor() {
        if (!this.selectedLineForColor) return;
        
        const lineKey = `${this.selectedLineForColor.number}-${this.selectedLineForColor.type}`;
        
        // Remove custom color
        delete this.lineColors[lineKey];
        this.saveLineColors();
        
        // Reset to default color
        const defaultColor = this.getLineColor(this.selectedLineForColor.number, this.selectedLineForColor.type);
        document.querySelectorAll(`[data-line="${this.selectedLineForColor.number}"][data-type="${this.selectedLineForColor.type}"]`).forEach(element => {
            element.style.backgroundColor = defaultColor;
        });
        
        this.closeColorModal();
    }
    
    updateDefaultLineColor(type, color) {
        // This would affect new lines of this type, but existing custom colors remain
        this.saveLineColors();
    }
    
    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.saveLanguage();
        this.updateLanguageDisplay();
        
        // If we're in the monitoring phase, regenerate boards with new language
        if (!document.getElementById('multi-boards').classList.contains('hidden')) {
            this.generateBoardContainers();
            this.fetchAllDepartures();
        }
    }
    
    updateLanguageDisplay() {
        // Update all translatable elements
        Object.keys(this.translations[this.currentLanguage]).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.tagName === 'INPUT' && key.includes('placeholder')) {
                    element.placeholder = this.translations[this.currentLanguage][key];
                } else {
                    element.textContent = this.translations[this.currentLanguage][key];
                }
            }
        });
        
        // Update elements with data-text-key attribute
        document.querySelectorAll('[data-text-key]').forEach(element => {
            const key = element.getAttribute('data-text-key');
            if (this.translations[this.currentLanguage][key]) {
                element.textContent = this.translations[this.currentLanguage][key];
            }
        });
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
        
        // Update current language display
        const currentLangElement = document.getElementById('current-language');
        if (currentLangElement) {
            currentLangElement.textContent = this.currentLanguage.toUpperCase();
        }
    }
    
    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    
    resetToStationSelection() {
        // Clear interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Reset data
        this.selectedStations = [];
        this.customStationNames = {};
        
        // Show station count selection, hide others
        document.getElementById('station-count-selection').classList.remove('hidden');
        document.getElementById('station-selection').classList.add('hidden');
        document.getElementById('station-customization').classList.add('hidden');
        document.getElementById('multi-boards').classList.add('hidden');
        document.getElementById('change-stations').classList.add('hidden');
        
        // Reset button states
        document.querySelectorAll('.station-count-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Clear session
        this.clearSession();
    }
    
    // Local Storage Management
    saveSession() {
        const session = {
            selectedStationCount: this.selectedStationCount,
            selectedStations: this.selectedStations,
            customStationNames: this.customStationNames
        };
        localStorage.setItem('zvv-session', JSON.stringify(session));
    }
    
    checkStoredSession() {
        const stored = localStorage.getItem('zvv-session');
        if (stored) {
            try {
                const session = JSON.parse(stored);
                if (session.selectedStations && session.selectedStations.length > 0) {
                    // Could restore session here if desired
                    // For now, we start fresh each time
                }
            } catch (error) {
                console.error('Error loading stored session:', error);
            }
        }
    }
    
    clearSession() {
        localStorage.removeItem('zvv-session');
    }
    
    saveLanguage() {
        localStorage.setItem('zvv-language', this.currentLanguage);
    }
    
    loadLanguage() {
        return localStorage.getItem('zvv-language') || 'de';
    }
    
    saveLineColors() {
        localStorage.setItem('zvv-line-colors', JSON.stringify(this.lineColors));
    }
    
    loadLineColors() {
        const stored = localStorage.getItem('zvv-line-colors');
        return stored ? JSON.parse(stored) : {};
    }
    
    applyStoredLineColors() {
        // This will be called when displaying departures
        // Colors are applied in the getLineColor method
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZVVDepartureBoard();
});

// Add global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
