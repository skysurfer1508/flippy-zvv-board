
import { LocationsResponse, StationBoardResponse } from '@/types/zvv';

export class ZvvApi {
  static async searchStations(query: string, country: string = 'ch'): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    try {
      const response = await fetch(
        `/api/locations?country=${encodeURIComponent(country)}&q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const stations = await response.json();
      return { stations: stations || [] };
    } catch (error) {
      console.error('Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: string = 'ch'): Promise<StationBoardResponse | null> {
    try {
      const response = await fetch(
        `/api/board?country=${encodeURIComponent(country)}&stop_id=${encodeURIComponent(stationId)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching station board:', error);
      return null;
    }
  }

  static async getLineDirections(stationId: string, country: string = 'ch'): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(
        `/api/board?country=${encodeURIComponent(country)}&stop_id=${encodeURIComponent(stationId)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const directionsMap: Record<string, Set<string>> = {};
      
      if (data.departures) {
        data.departures.forEach((departure: any) => {
          const lineNumber = departure.line;
          const direction = departure.dest;
          
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
}
