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
      
      if (country === 'canada') {
        response = await fetch(
          `${API_BASE_CANADA}/locations?country=ca&q=${encodeURIComponent(query)}`
        );
      } else {
        response = await fetch(
          `${API_BASE_SWISS}/locations?query=${encodeURIComponent(query)}&type=station`
        );
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (country === 'canada') {
        // Transform Canadian API response to match Swiss format
        return { 
          stations: data.map((station: any) => ({
            id: station.id,
            name: station.name,
            coordinate: station.lat && station.lon ? {
              type: 'WGS84',
              x: station.lat,
              y: station.lon
            } : undefined
          }))
        };
      }
      
      return { stations: data.stations || [] };
    } catch (error) {
      console.error('Error searching stations:', error);
      return { stations: [] };
    }
  }

  static async getStationBoard(stationId: string, country: string = 'switzerland'): Promise<StationBoardResponse | null> {
    try {
      let response;
      
      if (country === 'canada') {
        response = await fetch(
          `${API_BASE_CANADA}/board?country=ca&stop_id=${encodeURIComponent(stationId)}`
        );
      } else {
        response = await fetch(
          `${API_BASE_SWISS}/stationboard?station=${encodeURIComponent(stationId)}&limit=20`
        );
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (country === 'canada') {
        // Transform Canadian API response to match Swiss format
        return {
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
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching station board:', error);
      return null;
    }
  }

  static async getLineDirections(stationId: string, country: string = 'switzerland'): Promise<Record<string, string[]>> {
    try {
      let response;
      
      if (country === 'canada') {
        response = await fetch(
          `${API_BASE_CANADA}/board?country=ca&stop_id=${encodeURIComponent(stationId)}`
        );
      } else {
        response = await fetch(
          `${API_BASE_SWISS}/stationboard?station=${encodeURIComponent(stationId)}&limit=50`
        );
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
      
      return result;
    } catch (error) {
      console.error('Error fetching line directions:', error);
      return {};
    }
  }
}
