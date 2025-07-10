
# ZVV Multi-Country Departure Board - Real-time Transit Display

A modern web application for displaying real-time departure information from public transit systems across multiple countries, featuring an authentic flip-dot display design.

## 🌍 Supported Countries

| Country | Code | Provider | Status | API Source |
|---------|------|----------|--------|------------|
| 🇨🇭 Switzerland | `ch` | ZVV/SBB | ✅ Active | transport.opendata.ch |
| 🇩🇪 Germany | `de` | DB/ÖPNV | ✅ Active | transport.rest |
| 🇦🇹 Austria | `at` | ÖBB | 🚧 Coming Soon | AnachB VDV |
| 🇫🇷 France | `fr` | SNCF | 🚧 Coming Soon | SNCF Navitia |
| 🇮🇹 Italy | `it` | Trenitalia | 🚧 Coming Soon | ViaggiaTreno |
| 🇨🇦 Canada | `ca` | BC Transit | 🚧 Coming Soon | BC Transit GTFS |

## ✨ Features

- 🚊 **Real-time departures** for all supported transit systems
- 🔍 **Smart station search** with auto-suggestions (2+ characters)
- ⏰ **Live delay tracking** with real-time calculations  
- 📱 **Responsive design** optimized for all devices
- 🎨 **Authentic flip-dot styling** inspired by real transit displays
- 🔄 **Auto-refresh** every 25 seconds with intelligent caching
- 🌐 **Multi-language support** (DE, EN, FR, IT, GSW)
- 🎨 **Multiple themes** (Default, LED, Black/White, Modern, Classic)
- 🖼️ **Fullscreen mode** for dedicated displays

## 🚀 Quick Start

### With Docker Compose (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd zvv-multi-country-board

# Start containers
docker-compose up -d

# Open application
open http://localhost:8080
```

### With Docker

```bash
# Build image
docker build -t zvv-multi-app .

# Run container
docker run -p 8080:8080 zvv-multi-app
```

### Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies  
npm install

# Start backend
python app.py

# Start frontend (in another terminal)
npm run dev

# Open application
open http://localhost:5173
```

## 🏗️ Architecture

### Frontend Structure
```
src/
├── components/
│   ├── CountrySelection.tsx    # Country selection interface
│   ├── StationSelection.tsx    # Station search & selection
│   ├── DepartureBoard.tsx      # Real-time departure display
│   └── ...
├── services/
│   ├── countries/              # Country-specific API providers
│   │   ├── base.ts            # Provider interface
│   │   ├── switzerland.ts     # Swiss transport.opendata.ch
│   │   ├── germany.ts         # German transport.rest
│   │   └── index.ts           # Provider registry
│   └── zvvApi.ts              # Unified API layer
├── types/
│   └── zvv.ts                 # TypeScript definitions
└── utils/
    └── translations.ts        # Multi-language support
```

### Backend Structure
```
app.py                         # Flask backend
├── /api/locations             # Station search endpoint
├── /api/board                 # Departure board endpoint
└── static/                    # Served frontend assets
```

## 🛠️ API Endpoints

### Station Search
```http
GET /api/locations?country=<code>&query=<text>
```
**Parameters:**
- `country`: Country code (ch, de, at, fr, it, ca)
- `query`: Search query (minimum 2 characters)

**Response:**
```json
{
  "stations": [
    {
      "id": "8503000",
      "name": "Zürich HB",
      "coordinate": { "x": 47.3781, "y": 8.5398 }
    }
  ]
}
```

### Departure Board
```http
GET /api/board?country=<code>&station=<id>
```
**Parameters:**
- `country`: Country code
- `station`: Station ID from search results

**Response:**
```json
{
  "station": { "id": "8503000", "name": "Zürich HB" },
  "stationboard": [
    {
      "name": "S1",
      "category": "S",
      "to": "Winterthur",
      "stop": {
        "departure": "2025-07-10T14:05:00Z",
        "platform": "31",
        "prognosis": { "departure": "2025-07-10T14:07:00Z" }
      }
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables
```bash
FLASK_ENV=production          # or development
PYTHONPATH=/app              # for containers
```

### Country Provider Configuration
Each country has its own provider class implementing the `CountryProvider` interface:

```typescript
interface CountryProvider {
  code: string;
  name: string;
  searchStations(query: string): Promise<Location[]>;
  getStationBoard(stationId: string): Promise<StationBoardResponse | null>;
}
```

## 🎨 Design System

### Flip-Dot Display Features
- **Monospace typography** for authentic transit display look
- **Yellow-on-black color scheme** matching real ZVV displays
- **Animated transitions** with smooth hover effects
- **Responsive grid layout** adapting to screen sizes
- **LED and modern themes** for different display preferences

### Delay Visualization
- **Real-time calculation** using `prognosis.departure` vs scheduled time
- **Red highlighting** for delayed departures
- **Blinking animations** for attention-grabbing alerts
- **Platform changes** clearly indicated

## 🚦 Caching & Performance

- **25-second API cache** reduces load on upstream services
- **Graceful error handling** never returns HTTP 500 errors
- **Progressive loading** with skeleton states
- **Optimized bundle** with code splitting by country

## 🌐 Data Sources & Licensing

### Switzerland (CH)
- **Source**: [transport.opendata.ch](https://transport.opendata.ch)
- **License**: CC-BY 4.0
- **Coverage**: ZVV, SBB, PostBus, all Swiss public transport

### Germany (DE)
- **Source**: [transport.rest](https://transport.rest)
- **License**: CC-BY-SA (DB/ÖPNV data)
- **Coverage**: DB, regional transport, bus systems

### Austria (AT) - Coming Soon
- **Source**: AnachB VDV Interface
- **License**: OGD-AT
- **Coverage**: ÖBB, regional Austrian transport

### France (FR) - Coming Soon
- **Source**: SNCF Navitia API
- **License**: ODbL
- **Coverage**: SNCF, RATP, regional French transport

### Italy (IT) - Coming Soon
- **Source**: ViaggiaTreno API
- **License**: Trenitalia
- **Coverage**: Trenitalia, regional Italian transport

### Canada (CA) - Coming Soon
- **Source**: BC Transit GTFS
- **License**: OGL BC
- **Coverage**: BC Transit (Kelowna region)

## 🧪 Testing

### Smoke Tests
```bash
# Test station search
curl "http://localhost:8080/api/locations?country=ch&query=Zürich"
curl "http://localhost:8080/api/locations?country=de&query=Hamburg"

# Test departure boards
curl "http://localhost:8080/api/board?country=ch&station=8503000"
curl "http://localhost:8080/api/board?country=de&station=8098100"
```

### Health Checks
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test frontend
curl http://localhost:8080/
```

## 🚀 Deployment

### Portainer
1. Create new stack
2. Enter Git repository URL
3. Set stack name: `zvv-multi-board`
4. Deploy with docker-compose.yml

### Direct Docker
```bash
# Production build
docker build -t zvv-multi-board .
docker run -d -p 8080:8080 --name zvv-board zvv-multi-board
```

### Environment-specific Configs
```yaml
# docker-compose.prod.yml
services:
  app:
    restart: unless-stopped
    environment:
      - FLASK_ENV=production
    ports:
      - "80:8080"
```

## 🛠️ Development

### Adding New Countries
1. Create provider class in `src/services/countries/`
2. Implement `CountryProvider` interface
3. Add to `countryProviders` registry
4. Update `CountrySelection` component
5. Add translations in `src/utils/translations.ts`

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-country`
3. Implement changes with tests
4. Submit pull request

## 📊 Monitoring

### API Performance
- Response time targets: < 2s for search, < 3s for boards
- Cache hit ratio: > 80% during peak hours
- Error rate: < 1% for supported countries

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🆘 Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker-compose logs -f
lsof -i :8080  # Check port conflicts
```

**API errors:**
```bash
curl -v http://localhost:8080/api/locations?country=ch&query=test
docker exec -it zvv-board python -c "import requests; print(requests.get('https://transport.opendata.ch/v1/locations?query=test').status_code)"
```

**Frontend build issues:**
```bash
npm run build
npm run preview
```

### Performance Issues
- Check network connectivity to external APIs
- Verify cache configuration (25s TTL)
- Monitor memory usage in containers
- Check for JavaScript console errors

## 📜 License

MIT License - see LICENSE file for details

## 🙏 Credits

- **Swiss data**: [transport.opendata.ch](https://transport.opendata.ch)
- **German data**: [transport.rest](https://transport.rest) 
- **Design inspiration**: Real ZVV flip-dot displays
- **Built with**: React, TypeScript, Tailwind CSS, Flask
- **Hosted on**: Lovable AI Platform

---

**Built with ❤️ for public transit enthusiasts worldwide**
