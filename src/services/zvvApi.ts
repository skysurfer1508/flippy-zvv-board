import { LocationsResponse, StationBoardResponse, Country } from '@/types/zvv';

const API_BASE = '/api';

export class ZvvApi {
  static async searchStations(query: string, country: Country = 'switzerland'): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    try {
      const countryCode = this.getCountryCode(country);
      const response = await fetch(
        `${API_BASE}/locations?country=${countryCode}&query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Transform backend response to match frontend expectations
      const stations = Array.isArray(data) ? data : data.stations || [];
      return { stations };
    } catch (error) {
      console.error('Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: Country = 'switzerland'): Promise<StationBoardResponse | null> {
    try {
      const countryCode = this.getCountryCode(country);
      const response = await fetch(
        `${API_BASE}/board?country=${countryCode}&station=${encodeURIComponent(stationId)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform backend response to match ZVV API format
      const stationboard = (data.departures || []).map((dep: any) => ({
        stop: {
          station: {
            id: stationId,
            name: data.station || stationId
          },
          departure: dep.departure,
          platform: dep.platform,
          delay: dep.delay
        },
        name: dep.line,
        category: dep.category,
        number: dep.line,
        to: dep.destination
      }));

      return {
        station: {
          id: stationId,
          name: data.station || stationId
        },
        stationboard
      };
    } catch (error) {
      console.error('Error fetching station board:', error);
      return null;
    }
  }

  static async getLineDirections(stationId: string, country: Country = 'switzerland'): Promise<Record<string, string[]>> {
    try {
      const stationBoard = await this.getStationBoard(stationId, country);
      const directionsMap: Record<string, Set<string>> = {};
      
      if (stationBoard?.stationboard) {
        stationBoard.stationboard.forEach((departure: any) => {
          const lineNumber = departure.number || departure.name;
          const direction = departure.to;
          
          if (lineNumber && direction) {
            if (!directionsMap[lineNumber]) {
              directionsMap[lineNumber] = new Set();
            }
            directionsMap[lineNumber].add(direction);
          }
        });
      }
      
      // Convert Sets to Arrays
      const result: Record<string, string[]> = {};
      Object.keys(directionsMap).forEach(line => {
        result[line] = Array.from(directionsMap[line]);
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching line directions:', error);
      return {};
    }
  }

  private static getCountryCode(country: Country): string {
    const countryMap: Record<Country, string> = {
      'switzerland': 'ch',
      'germany': 'de',
      'austria': 'at',
      'france': 'fr',
      'italy': 'it',
      'canada': 'ca'
    };
    return countryMap[country] || 'ch';
  }
}