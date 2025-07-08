// Language translations
const translations = {
    de: {
        title: "ZVV Abfahrtszeiten",
        stationCountQuestion: "Wie viele Stationen möchten Sie anzeigen?",
        stationCountLabel: "Anzahl Stationen:",
        confirmButton: "Bestätigen", 
        startButton: "Anzeige starten",
        stationLabel: "Station",
        leftLabel: "(Links)",
        rightLabel: "(Rechts)",
        customizeTitle: "Stationen anpassen",
        customNameLabel: "Anzeigename für Station",
        colorCustomization: "Linien-Farben anpassen",
        tramColor: "Tram-Farbe:",
        busColor: "Bus-Farbe:",
        trainColor: "Zug-Farbe:",
        line: "Linie",
        destination: "Ziel", 
        platform: "Gleis",
        departure: "Abfahrt",
        loading: "Lade Abfahrtszeiten...",
        noData: "Lade Abfahrtszeiten...",
        lastUpdated: "Lädt...",
        changeStations: "Stationen ändern",
        footerText: "Daten von transport.opendata.ch | Aktualisierung alle 25 Sekunden",
        colorModalTitle: "Farbe für Linie",
        colorModalSelect: "auswählen",
        apply: "Übernehmen",
        cancel: "Abbrechen",
        languageSelection: "Sprache"
    },
    en: {
        title: "ZVV Departure Times",
        stationCountQuestion: "How many stations would you like to display?",
        stationCountLabel: "Number of stations:",
        confirmButton: "Confirm",
        startButton: "Start Display",
        stationLabel: "Station",
        leftLabel: "(Left)",
        rightLabel: "(Right)", 
        customizeTitle: "Customize Stations",
        customNameLabel: "Display name for Station",
        colorCustomization: "Customize Line Colors",
        tramColor: "Tram Color:",
        busColor: "Bus Color:",
        trainColor: "Train Color:",
        line: "Line",
        destination: "Destination",
        platform: "Platform", 
        departure: "Departure",
        loading: "Loading departure times...",
        noData: "Loading departure times...",
        lastUpdated: "Loading...",
        changeStations: "Change Stations",
        footerText: "Data from transport.opendata.ch | Updated every 25 seconds",
        colorModalTitle: "Select color for line",
        colorModalSelect: "",
        apply: "Apply",
        cancel: "Cancel",
        languageSelection: "Language"
    }
};

let currentLanguage = 'de';
let currentStationCount = 2;
let selectedStations = [];
let customStationNames = {};
let customLineColors = {
    tram: '#4ecdc4',
    bus: '#ff6b6b', 
    train: '#ffd700'
};
let updateInterval;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeLanguageSelector();
    initializeStationCountSlider();
    updateLanguage();
});

function initializeLanguageSelector() {
    // Create language selector button
    const languageButton = document.createElement('button');
    languageButton.id = 'language-selector';
    languageButton.className = 'language-selector-btn';
    languageButton.innerHTML = '🌐 ' + translations[currentLanguage].languageSelection;
    
    // Create language dropdown
    const languageDropdown = document.createElement('div');
    languageDropdown.id = 'language-dropdown';
    languageDropdown.className = 'language-dropdown hidden';
    languageDropdown.innerHTML = `
        <div class="language-option" data-lang="de">🇩🇪 Deutsch</div>
        <div class="language-option" data-lang="en">🇬🇧 English</div>
    `;
    
    // Add to footer
    const footer = document.querySelector('footer');
    footer.appendChild(languageButton);
    footer.appendChild(languageDropdown);
    
    // Event listeners
    languageButton.addEventListener('click', function() {
        languageDropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', function(e) {
        if (!languageButton.contains(e.target) && !languageDropdown.contains(e.target)) {
            languageDropdown.classList.add('hidden');
        }
    });
    
    languageDropdown.addEventListener('click', function(e) {
        const option = e.target.closest('.language-option');
        if (option) {
            currentLanguage = option.dataset.lang;
            updateLanguage();
            languageDropdown.classList.add('hidden');
        }
    });
}

function initializeStationCountSlider() {
    const slider = document.getElementById('station-count-slider');
    const display = document.getElementById('station-count-display');
    const confirmBtn = document.getElementById('confirm-station-count');
    
    // Set initial values
    slider.value = currentStationCount;
    display.textContent = currentStationCount;
    
    // Update display when slider changes
    slider.addEventListener('input', function() {
        currentStationCount = parseInt(this.value);
        display.textContent = currentStationCount;
    });
    
    // Confirm button functionality
    confirmBtn.addEventListener('click', function() {
        generateStationInputs();
        showStationSelection();
    });
}

function generateStationInputs() {
    const container = document.querySelector('.dynamic-input-container');
    container.innerHTML = '';
    
    // Generate input fields based on station count
    for (let i = 1; i <= currentStationCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'station-input-group';
        inputGroup.innerHTML = `
            <label for="station${i}-input">${translations[currentLanguage].stationLabel} ${i}</label>
            <div class="search-container">
                <input type="text" id="station${i}-input" placeholder="${translations[currentLanguage].stationLabel} ${i}..." autocomplete="off">
                <div id="suggestions${i}" class="suggestions"></div>
            </div>
        `;
        container.appendChild(inputGroup);
    }
    
    // Add start button
    const startButton = document.createElement('button');
    startButton.id = 'start-display';
    startButton.className = 'start-btn';
    startButton.textContent = translations[currentLanguage].startButton;
    startButton.addEventListener('click', startDisplay);
    
    const stationSelection = document.getElementById('station-selection');
    stationSelection.appendChild(startButton);
    
    // Initialize autocomplete for all inputs
    for (let i = 1; i <= currentStationCount; i++) {
        initializeAutocomplete(i);
    }
}

function showStationSelection() {
    document.getElementById('station-count-selection').classList.add('hidden');
    document.getElementById('station-selection').classList.remove('hidden');
}

function initializeAutocomplete(stationIndex) {
    const input = document.getElementById(`station${stationIndex}-input`);
    const suggestions = document.getElementById(`suggestions${stationIndex}`);
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        fetch(`http://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                suggestions.innerHTML = '';
                if (data.stations && data.stations.length > 0) {
                    data.stations.slice(0, 5).forEach(station => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.textContent = station.name;
                        item.addEventListener('click', function() {
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
            })
            .catch(error => {
                console.error('Error fetching stations:', error);
                suggestions.style.display = 'none';
            });
    });
}

function startDisplay() {
    // Collect all selected stations
    selectedStations = [];
    let allStationsSelected = true;
    
    for (let i = 1; i <= currentStationCount; i++) {
        const input = document.getElementById(`station${i}-input`);
        if (input.value.trim() && input.dataset.stationId) {
            selectedStations.push({
                name: input.value.trim(),
                id: input.dataset.stationId
            });
        } else {
            allStationsSelected = false;
            break;
        }
    }
    
    if (!allStationsSelected) {
        alert('Bitte wählen Sie alle Stationen aus.');
        return;
    }
    
    // Show customization phase
    showCustomization();
}

function showCustomization() {
    document.getElementById('station-selection').classList.add('hidden');
    document.getElementById('station-customization').classList.remove('hidden');
    
    // Generate customization inputs
    const container = document.querySelector('.customization-container');
    container.innerHTML = '';
    
    selectedStations.forEach((station, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-input-group';
        inputGroup.innerHTML = `
            <label for="custom-name${index + 1}">${translations[currentLanguage].customNameLabel} ${index + 1}:</label>
            <input type="text" id="custom-name${index + 1}" placeholder="${station.name}" value="${station.name}">
        `;
        container.appendChild(inputGroup);
    });
    
    // Update apply button
    const applyBtn = document.getElementById('apply-customization');
    applyBtn.textContent = translations[currentLanguage].startButton;
}

function updateLanguage() {
    const t = translations[currentLanguage];
    
    // Update title
    document.querySelector('h1').textContent = t.title;
    
    // Update station count selection
    document.querySelector('#station-count-selection h2').textContent = t.stationCountQuestion;
    document.querySelector('label[for="station-count-slider"]').innerHTML = 
        `${t.stationCountLabel} <span id="station-count-display">${currentStationCount}</span>`;
    document.getElementById('confirm-station-count').textContent = t.confirmButton;
    
    // Update customization section
    document.querySelector('#station-customization h2').textContent = t.customizeTitle;
    document.querySelector('.color-customization h3').textContent = t.colorCustomization;
    
    // Update color labels
    document.querySelector('label[for="tram-color"]').textContent = t.tramColor;
    document.querySelector('label[for="bus-color"]').textContent = t.busColor;
    document.querySelector('label[for="train-color"]').textContent = t.trainColor;
    
    // Update footer
    document.querySelector('footer p').textContent = t.footerText;
    
    // Update language selector
    const langBtn = document.getElementById('language-selector');
    if (langBtn) {
        langBtn.innerHTML = '🌐 ' + t.languageSelection;
    }
    
    // Update change stations button if visible
    const changeBtn = document.getElementById('change-stations');
    if (changeBtn && !changeBtn.classList.contains('hidden')) {
        changeBtn.textContent = t.changeStations;
    }
}

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
