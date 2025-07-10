
export interface CountryProvider {
  code: string;
  name: string;
  searchStations(query: string): Promise<Location[]>;
  getStationBoard(stationId: string): Promise<StationBoardResponse | null>;
}

export interface Location {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
}

export interface Departure {
  line: string;
  destination: string;
  departure: string;
  platform?: string;
  delay: number;
  category: string;
}

export interface StationBoardResponse {
  station: {
    id: string;
    name: string;
  };
  departures: Departure[];
  updated: string;
}
