import { CountryProvider } from './base';
import { SwitzerlandProvider } from './switzerland';
import { GermanyProvider } from './germany';

export const countryProviders: Record<string, CountryProvider> = {
  ch: new SwitzerlandProvider(),
  de: new GermanyProvider(),
  // Other countries will be added as stubs for now
  at: {
    code: 'at',
    name: 'Austria',
    searchStations: async () => [],
    getStationBoard: async () => null
  },
  fr: {
    code: 'fr',
    name: 'France', 
    searchStations: async () => [],
    getStationBoard: async () => null
  },
  it: {
    code: 'it',
    name: 'Italy',
    searchStations: async () => [],
    getStationBoard: async () => null
  },
  ca: {
    code: 'ca',
    name: 'Canada',
    searchStations: async () => [],
    getStationBoard: async () => null
  }
};

export { CountryProvider } from './base';
export * from './switzerland';
export * from './germany';
