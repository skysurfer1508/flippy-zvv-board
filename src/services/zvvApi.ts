
import { LocationsResponse, StationBoardResponse } from '@/types/zvv';

const API_BASE = 'https://transport.opendata.ch/v1';

export class ZvvApi {
  static async searchStations(query: string): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    try {
      const response = await fetch(
        `${API_BASE}/locations?query=${encodeURIComponent(query)}&type=station`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { stations: data.stations || [] };
    } catch (error) {
      console.error('Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string): Promise<StationBoardResponse | null> {
    try {
      const response = await fetch(
        `${API_BASE}/stationboard?station=${encodeURIComponent(stationId)}&limit=20`
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

  static async getLineDirections(stationId: string): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(
        `${API_BASE}/stationboard?station=${encodeURIComponent(stationId)}&limit=50`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const directionsMap: Record<string, Set<string>> = {};
      
      if (data.stationboard) {
        data.stationboard.forEach((departure: any) => {
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
}
