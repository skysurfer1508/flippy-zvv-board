
import { countryProviders } from './countries';
import { LocationsResponse, StationBoardResponse } from '@/types/zvv';

export class ZvvApi {
  static async searchStations(query: string, country: string = 'ch'): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    const provider = countryProviders[country];
    if (!provider) {
      console.warn(`No provider found for country: ${country}`);
      return { stations: [] };
    }

    try {
      const locations = await provider.searchStations(query);
      return { 
        stations: locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          coordinate: loc.lat && loc.lon ? {
            type: 'WGS84',
            x: loc.lat,
            y: loc.lon
          } : undefined
        }))
      };
    } catch (error) {
      console.error(`Error searching stations in ${country}:`, error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: string = 'ch'): Promise<StationBoardResponse | null> {
    const provider = countryProviders[country];
    if (!provider) {
      console.warn(`No provider found for country: ${country}`);
      return null;
    }

    try {
      const boardData = await provider.getStationBoard(stationId);
      if (!boardData) return null;

      return {
        station: {
          id: boardData.station.id,
          name: boardData.station.name
        },
        stationboard: boardData.departures.map(dep => ({
          stop: {
            station: {
              id: boardData.station.id,
              name: boardData.station.name
            },
            departure: dep.departure,
            platform: dep.platform,
            prognosis: dep.delay > 0 ? {
              departure: new Date(new Date(dep.departure).getTime() + dep.delay * 60000).toISOString()
            } : undefined
          },
          name: dep.line,
          category: dep.category,
          number: dep.line,
          to: dep.destination,
          operator: 'Unknown'
        }))
      };
    } catch (error) {
      console.error(`Error fetching station board in ${country}:`, error);
      return null;
    }
  }

  static async getLineDirections(stationId: string, country: string = 'ch'): Promise<Record<string, string[]>> {
    const boardData = await this.getStationBoard(stationId, country);
    if (!boardData) return {};
    
    const directionsMap: Record<string, Set<string>> = {};
    
    boardData.stationboard.forEach(departure => {
      const lineNumber = departure.number || departure.name;
      const direction = departure.to;
      
      if (lineNumber && direction) {
        if (!directionsMap[lineNumber]) {
          directionsMap[lineNumber] = new Set();
        }
        directionsMap[lineNumber].add(direction);
      }
    });
    
    const result: Record<string, string[]> = {};
    Object.keys(directionsMap).forEach(line => {
      result[line] = Array.from(directionsMap[line]);
    });
    
    return result;
  }
}
