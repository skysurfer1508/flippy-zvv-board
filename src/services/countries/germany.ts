
import { CountryProvider, Location, StationBoardResponse } from './base';

export class GermanyProvider implements CountryProvider {
  code = 'de';
  name = 'Germany';

  async searchStations(query: string): Promise<Location[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `https://v5.transport.rest/locations?query=${encodeURIComponent(query)}&results=10`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return (data || []).filter((loc: any) => loc.type === 'stop').map((station: any) => ({
        id: station.id,
        name: station.name,
        lat: station.location?.latitude,
        lon: station.location?.longitude
      }));
    } catch (error) {
      console.error('Error searching German stations:', error);
      return [];
    }
  }

  async getStationBoard(stationId: string): Promise<StationBoardResponse | null> {
    try {
      const response = await fetch(
        `https://v5.transport.rest/stops/${encodeURIComponent(stationId)}/departures?duration=30`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const departures = (data.departures || []).slice(0, 20).map((dep: any) => {
        const scheduledTime = dep.plannedWhen;
        const actualTime = dep.when;
        
        let delay = 0;
        if (actualTime && scheduledTime) {
          const scheduled = new Date(scheduledTime);
          const actual = new Date(actualTime);
          delay = Math.round((actual.getTime() - scheduled.getTime()) / (1000 * 60));
        }
        
        return {
          line: dep.line?.name || 'Unknown',
          destination: dep.destination?.name || 'Unknown',
          departure: scheduledTime,
          platform: dep.platform || '',
          delay: Math.max(0, delay),
          category: dep.line?.product || 'unknown'
        };
      });

      return {
        station: {
          id: stationId,
          name: data.name || 'Unknown'
        },
        departures,
        updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching German station board:', error);
      return null;
    }
  }
}
