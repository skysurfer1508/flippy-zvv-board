
class ZVVDepartures {
    constructor() {
        this.stationInput = document.getElementById('station-input');
        this.suggestions = document.getElementById('suggestions');
        this.departuresList = document.getElementById('departures-list');
        this.loading = document.getElementById('loading');
        
        this.currentStation = null;
        this.selectedIndex = -1;
        this.suggestionsData = [];
        this.refreshInterval = null;
        
        this.init();
    }
    
    init() {
        this.stationInput.addEventListener('input', this.handleStationInput.bind(this));
        this.stationInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
    
    async handleStationInput(event) {
        const query = event.target.value.trim();
        
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        try {
            const response = await fetch(`/api/locations?query=${encodeURIComponent(query)}`);
            const stations = await response.json();
            
            this.suggestionsData = stations;
            this.showSuggestions(stations);
        } catch (error) {
            console.error('Error fetching stations:', error);
            this.hideSuggestions();
        }
    }
    
    handleKeyDown(event) {
        if (!this.suggestionsData.length) return;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestionsData.length - 1);
                this.updateSelection();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
                
            case 'Enter':
                event.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectStation(this.suggestionsData[this.selectedIndex]);
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }
    
    handleDocumentClick(event) {
        if (!this.suggestions.contains(event.target) && event.target !== this.stationInput) {
            this.hideSuggestions();
        }
    }
    
    showSuggestions(stations) {
        if (!stations.length) {
            this.hideSuggestions();
            return;
        }
        
        this.suggestions.innerHTML = stations.map((station, index) => 
            `<div class="suggestion-item" data-index="${index}" onclick="zvvApp.selectStation(zvvApp.suggestionsData[${index}])">
                ${this.escapeHtml(station.name)}
            </div>`
        ).join('');
        
        this.suggestions.style.display = 'block';
        this.selectedIndex = -1;
    }
    
    hideSuggestions() {
        this.suggestions.style.display = 'none';
        this.selectedIndex = -1;
    }
    
    updateSelection() {
        const items = this.suggestions.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }
    
    selectStation(station) {
        this.currentStation = station;
        this.stationInput.value = station.name;
        this.hideSuggestions();
        this.loadDepartures();
        this.startAutoRefresh();
    }
    
    async loadDepartures() {
        if (!this.currentStation) return;
        
        this.showLoading();
        
        try {
            const response = await fetch(`/api/board?station=${encodeURIComponent(this.currentStation.id)}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.displayDepartures(data.departures);
        } catch (error) {
            console.error('Error loading departures:', error);
            this.showError('Fehler beim Laden der Abfahrtszeiten');
        } finally {
            this.hideLoading();
        }
    }
    
    displayDepartures(departures) {
        if (!departures || !departures.length) {
            this.departuresList.innerHTML = '<div class="no-data">Keine Abfahrten gefunden</div>';
            return;
        }
        
        const now = new Date();
        const departuresHtml = departures.map(departure => {
            const departureTime = new Date(departure.departure);
            const timeStr = departureTime.toLocaleTimeString('de-CH', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const lineClass = this.getLineClass(departure.category);
            const delayHtml = departure.delay > 0 ? 
                `<span class="delay">+${departure.delay}'</span>` : '';
            
            return `
                <div class="departure-row">
                    <div class="line-number ${lineClass}">${this.escapeHtml(departure.line)}</div>
                    <div class="destination">${this.escapeHtml(departure.destination)}</div>
                    <div class="platform">${this.escapeHtml(departure.platform)}</div>
                    <div class="departure-time">
                        ${timeStr}
                        ${delayHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        this.departuresList.innerHTML = departuresHtml;
    }
    
    getLineClass(category) {
        switch (category?.toLowerCase()) {
            case 'bus': return 'bus';
            case 'tram': return 'tram';
            default: return '';
        }
    }
    
    showLoading() {
        this.loading.classList.remove('hidden');
    }
    
    hideLoading() {
        this.loading.classList.add('hidden');
    }
    
    showError(message) {
        this.departuresList.innerHTML = `<div class="no-data" style="color: #ff4444;">${this.escapeHtml(message)}</div>`;
    }
    
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.currentStation) {
                this.loadDepartures();
            }
        }, 25000); // 25 Sekunden
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// App initialisieren
const zvvApp = new ZVVDepartures();
