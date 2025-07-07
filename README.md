
# ZVV Abfahrtszeiten - Real-time Departure Board

Eine moderne Web-Anwendung zur Anzeige von ZVV-Abfahrtszeiten mit authentischem Flip-Dot-Display-Design.

## Features

- 🚊 Echtzeit-Abfahrtszeiten für alle ZVV-Stationen
- 🔍 Intelligente Stationssuche mit Auto-Suggest
- ⏰ Verspätungsanzeige in Echtzeit
- 📱 Responsive Design für alle Geräte
- 🎨 Authentisches Flip-Dot-Display-Styling
- 🔄 Automatische Aktualisierung alle 25 Sekunden

## Technologie-Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **API**: transport.opendata.ch
- **Container**: Docker & Docker Compose

## Schnellstart

### Mit Docker Compose (empfohlen)

```bash
# Repository klonen
git clone <your-repo-url>
cd zvv-departures

# Container starten
docker-compose up -d

# App öffnen
open http://localhost:8080
```

### Mit Docker

```bash
# Image bauen
docker build -t zvv-app .

# Container starten
docker run -p 8080:8080 zvv-app
```

### Lokale Entwicklung

```bash
# Dependencies installieren
pip install -r requirements.txt

# App starten
python app.py

# App öffnen
open http://localhost:8080
```

## API Endpoints

### `/api/locations`
Stationssuche mit Auto-Suggest
- **Parameter**: `query` (String, min. 2 Zeichen)
- **Response**: Array von Stationen mit `id` und `name`

### `/api/board`
Abfahrts-Board für eine Station
- **Parameter**: `station` (String, Station ID)
- **Response**: Abfahrten mit Linie, Ziel, Zeit und Verspätung

## Deployment

### Portainer
1. Neue Stack erstellen
2. Git Repository URL eingeben
3. Stack Name: `zvv-departures`
4. Deploy

### Direkter Git-Build
```bash
git clone <your-repo-url>
cd zvv-departures
docker-compose up -d
```

## Konfiguration

### Environment Variables
- `FLASK_ENV`: `production` oder `development`
- `PYTHONPATH`: `/app` (für Container)

### Port-Konfiguration
Standard-Port: `8080`
Anpassung in `docker-compose.yml` oder `Dockerfile`

## Features im Detail

### Flip-Dot Design
- Monospace-Schriftart für authentischen Look
- Gelb-schwarze Farbgebung wie echte ZVV-Displays
- Animierte Übergänge und Hover-Effekte
- Responsive Grid-Layout

### Verspätungen
- Echtzeit-Berechnung über `prognosis.departure`
- Rote Hervorhebung bei Verspätungen
- Blinkende Animation für Aufmerksamkeit

### Caching
- 25-Sekunden-Cache für API-Anfragen
- Reduziert Load auf transport.opendata.ch
- Verbesserte Performance

## API-Limitierungen

- Keine GTFS-RT Integration (bewusst ausgelassen)
- Abhängig von transport.opendata.ch Verfügbarkeit
- Cache-basierte Aktualisierung (25s Intervall)

## Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker-compose logs -f

# Port-Konflikte prüfen
lsof -i :8080
```

### API-Fehler
```bash
# Health Check
curl http://localhost:8080/api/locations?query=Zürich

# Container-Status
docker-compose ps
```

## Entwicklung

### Struktur
```
├── app.py              # Flask Backend
├── templates/
│   └── index.html      # Frontend Template
├── static/
│   ├── style.css       # Flip-Dot Styling
│   └── script.js       # Frontend Logic
├── Dockerfile          # Container Build
├── docker-compose.yml  # Multi-Container Setup
└── requirements.txt    # Python Dependencies
```

### Lokale Entwicklung
```bash
# Virtual Environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Dependencies
pip install -r requirements.txt

# Development Server
FLASK_ENV=development python app.py
```

## Contributing

1. Fork das Repository
2. Feature Branch erstellen
3. Änderungen committen
4. Pull Request erstellen

## Lizenz

MIT License - siehe LICENSE Datei für Details

## Credits

- Daten: [transport.opendata.ch](https://transport.opendata.ch)
- Design inspiriert von echten ZVV Flip-Dot Displays
- Built with ❤️ für das ZVV-Netz
