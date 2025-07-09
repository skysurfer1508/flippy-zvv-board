
import { LocationsResponse, StationBoardResponse } from '@/types/zvv';

const API_BASE = 'https://transport.opendata.ch/v1';

export class ZvvApi {
  static async searchStations(query: string, country: string = 'ch'): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    try {
      // Use the Flask backend API for all countries
      const response = await fetch(
        `/api/locations?country=${encodeURIComponent(country)}&q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Convert the backend format to frontend format
      const stations = data.map((station: any) => ({
        id: station.id,
        name: station.name,
        coordinate: station.lat && station.lon ? {
          type: 'WGS84',
          x: station.lon,
          y: station.lat
        } : undefined
      }));
      return { stations };
    } catch (error) {
      console.error('Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: string = 'ch'): Promise<StationBoardResponse | null> {
    try {
      // Use the Flask backend API for all countries
      const response = await fetch(
        `/api/board?country=${encodeURIComponent(country)}&stop_id=${encodeURIComponent(stationId)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert backend format to frontend format
      const stationboard = data.departures?.map((dep: any) => ({
        stop: {
          station: {
            id: stationId,
            name: '',
            coordinate: undefined
          },
          departure: dep.time,
          platform: dep.platform || '',
          prognosis: dep.delay > 0 ? {
            departure: dep.time,
            delay: dep.delay
          } : undefined
        },
        name: dep.line,
        category: dep.line.match(/\d/) ? 'T' : 'BUS', // Simple categorization
        to: dep.dest,
        number: dep.line
      })) || [];

      return {
        station: {
          id: stationId,
          name: data.station || ''
        },
        stationboard
      };
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
