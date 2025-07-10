
import { CountryProvider, Location, StationBoardResponse } from './base';

export class SwitzerlandProvider implements CountryProvider {
  code = 'ch';
  name = 'Switzerland';

  async searchStations(query: string): Promise<Location[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return (data.stations || []).slice(0, 10).map((station: any) => ({
        id: station.id,
        name: station.name,
        lat: station.coordinate?.x,
        lon: station.coordinate?.y
      }));
    } catch (error) {
      console.error('Error searching Swiss stations:', error);
      return [];
    }
  }

  async getStationBoard(stationId: string): Promise<StationBoardResponse | null> {
    try {
      const response = await fetch(
        `https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(stationId)}&limit=20`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const departures = (data.stationboard || []).map((dep: any) => {
        const scheduledTime = dep.stop?.departure;
        const prognosisTime = dep.stop?.prognosis?.departure;
        
        let delay = 0;
        if (prognosisTime && scheduledTime) {
          const scheduled = new Date(scheduledTime);
          const actual = new Date(prognosisTime);
          delay = Math.round((actual.getTime() - scheduled.getTime()) / (1000 * 60));
        }
        
        return {
          line: dep.number || dep.name,
          destination: dep.to,
          departure: scheduledTime,
          platform: dep.stop?.platform || '',
          delay: Math.max(0, delay),
          category: dep.category
        };
      });

      return {
        station: {
          id: stationId,
          name: data.station?.name || 'Unknown'
        },
        departures,
        updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching Swiss station board:', error);
      return null;
    }
  }
}
