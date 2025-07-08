export interface Location {
  id: string;
  name: string;
  score?: number;
  coordinate?: {
    type: string;
    x: number;
    y: number;
  };
  distance?: number;
}

export interface LocationsResponse {
  stations: Location[];
}

export interface Stop {
  station: {
    id: string;
    name: string;
    coordinate?: {
      type: string;
      x: number;
      y: number;
    };
  };
  arrival?: string;
  departure?: string;
  delay?: number;
  platform?: string;
  prognosis?: {
    platform?: string;
    arrival?: string;
    departure?: string;
    delay?: number;
  };
}

export interface Journey {
  name: string;
  category: string;
  subcategory?: string;
  categoryCode?: number;
  number?: string;
  operator?: string;
  to: string;
  passList: Stop[];
  capacity1st?: number;
  capacity2nd?: number;
}

export interface Departure {
  stop: Stop;
  name: string;
  category: string;
  subcategory?: string;
  categoryCode?: number;
  number?: string;
  operator?: string;
  to: string;
  passList?: Stop[];
  capacity1st?: number;
  capacity2nd?: number;
}

export interface StationBoardResponse {
  station: {
    id: string;
    name: string;
    coordinate?: {
      type: string;
      x: number;
      y: number;
    };
  };
  stationboard: Departure[];
}

export interface StationConfig {
  id: string;
  name: string;
  customName?: string;
  lineColors?: Record<string, string>;
}

export type SupportedLanguage = 'de' | 'en' | 'fr' | 'it' | 'gsw';

export type Theme = 'default' | 'led' | 'blackwhite' | 'modern' | 'classic';

export interface AppState {
  stationCount: number;
  stations: StationConfig[];
  customColors: {
    tram: string;
    bus: string;
    train: string;
  };
  phase: 'count-selection' | 'station-selection' | 'customization' | 'monitoring';
  language: SupportedLanguage;
  theme: Theme;
  isFullscreen: boolean;
}
