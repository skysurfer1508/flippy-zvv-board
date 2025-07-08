
import { LocationsResponse, StationBoardResponse } from '@/types/zvv';

const API_BASE_SWISS = 'https://transport.opendata.ch/v1';
const API_BASE_CANADA = '/api'; // Our backend endpoints

export class ZvvApi {
  static async searchStations(query: string, country: string = 'switzerland'): Promise<LocationsResponse> {
    if (!query || query.length < 2) {
      return { stations: [] };
    }

    try {
      let response;
      
      console.log(`ZvvApi: Searching stations - Country: ${country}, Query: "${query}"`);
      
      if (country === 'canada') {
        const url = `${API_BASE_CANADA}/locations?country=ca&q=${encodeURIComponent(query)}`;
        console.log(`ZvvApi: Fetching from Canadian API: ${url}`);
        response = await fetch(url);
      } else {
        const url = `${API_BASE_SWISS}/locations?query=${encodeURIComponent(query)}&type=station`;
        console.log(`ZvvApi: Fetching from Swiss API: ${url}`);
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`ZvvApi: API response for ${country}:`, data);
      
      // Both APIs now return consistent format: { stations: [...] }
      const result = { stations: data.stations || [] };
      console.log(`ZvvApi: Returning ${result.stations.length} stations for ${country}`);
      
      return result;
    } catch (error) {
      console.error('ZvvApi: Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: string = 'switzerland'): Promise<StationBoardResponse | null> {
    try {
      let response;
      
      console.log(`ZvvApi: Getting station board - Country: ${country}, StationId: ${stationId}`);
      
      if (country === 'canada') {
        const url = `${API_BASE_CANADA}/board?country=ca&stop_id=${encodeURIComponent(stationId)}`;
        console.log(`ZvvApi: Fetching Canadian board from: ${url}`);
        response = await fetch(url);
      } else {
        const url = `${API_BASE_SWISS}/stationboard?station=${encodeURIComponent(stationId)}&limit=20`;
        console.log(`ZvvApi: Fetching Swiss board from: ${url}`);
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`ZvvApi: Board response for ${country}:`, data);
      
      if (country === 'canada') {
        // Transform Canadian API response to match Swiss format
        const result = {
          station: {
            id: stationId,
            name: data.station_name || 'Unknown Station'
          },
          stationboard: data.departures?.map((dep: any) => ({
            stop: {
              station: {
                id: stationId,
                name: data.station_name || 'Unknown Station'
              },
              departure: dep.departure_time,
              delay: dep.delay || 0,
              platform: dep.platform
            },
            name: dep.route_short_name || dep.route_id,
            category: dep.route_type === '3' ? 'Bus' : 'Transit',
            number: dep.route_short_name,
            to: dep.trip_headsign || dep.destination,
            operator: 'BC Transit'
          })) || []
        };
        console.log(`ZvvApi: Transformed Canadian board result:`, result);
        return result;
      }
      
      console.log(`ZvvApi: Returning Swiss board data as-is`);
      return data;
    } catch (error) {
      console.error('ZvvApi: Error fetching station board:', error);
      return null;
    }
  }

  static async getLineDirections(stationId: string, country: string = 'switzerland'): Promise<Record<string, string[]>> {
    try {
      let response;
      
      console.log(`ZvvApi: Getting line directions - Country: ${country}, StationId: ${stationId}`);
      
      if (country === 'canada') {
        const url = `${API_BASE_CANADA}/board?country=ca&stop_id=${encodeURIComponent(stationId)}`;
        response = await fetch(url);
      } else {
        const url = `${API_BASE_SWISS}/stationboard?station=${encodeURIComponent(stationId)}&limit=50`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const directionsMap: Record<string, Set<string>> = {};
      
      if (country === 'canada') {
        if (data.departures) {
          data.departures.forEach((departure: any) => {
            const lineNumber = departure.route_short_name || departure.route_id;
            const direction = departure.trip_headsign || departure.destination;
            
            if (lineNumber && direction) {
              if (!directionsMap[lineNumber]) {
                directionsMap[lineNumber] = new Set();
              }
              directionsMap[lineNumber].add(direction);
            }
          });
        }
      } else {
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
      }
      
      // Convert Sets to Arrays
      const result: Record<string, string[]> = {};
      Object.keys(directionsMap).forEach(line => {
        result[line] = Array.from(directionsMap[line]);
      });
      
      console.log(`ZvvApi: Line directions result for ${country}:`, result);
      return result;
    } catch (error) {
      console.error('ZvvApi: Error fetching line directions:', error);
      return {};
    }
  }
}
