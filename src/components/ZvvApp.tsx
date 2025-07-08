
import { useState, useEffect } from "react";
import { StationCountSelector } from "./StationCountSelector";
import { StationSelection } from "./StationSelection";
import { StationCustomization } from "./StationCustomization";
import { DepartureBoard } from "./DepartureBoard";
import { AppState, StationConfig } from "@/types/zvv";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const INITIAL_STATE: AppState = {
  stationCount: 2,
  stations: [],
  customColors: {
    tram: '#4ecdc4',
    bus: '#ff6b6b', 
    train: '#ffd700'
  },
  phase: 'count-selection'
};

export function ZvvApp() {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from sessionStorage on mount - only once
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        console.log('ZvvApp: Loading saved state from sessionStorage...');
        const savedState = sessionStorage.getItem('zvv-app-state');
        
        if (savedState) {
          const parsed = JSON.parse(savedState);
          console.log('ZvvApp: Parsed saved state:', parsed);
          
          // Validate that all required stations are properly configured
          const hasValidStations = parsed.stations?.length === parsed.stationCount;
          const allStationsConfigured = hasValidStations && 
                                      parsed.stations.every((station: StationConfig) => 
                                        station.id && station.name && station.id.trim() !== '' && station.name.trim() !== ''
                                      );
          
          console.log('ZvvApp: Validation - hasValidStations:', hasValidStations, 'allStationsConfigured:', allStationsConfigured);
          
          if (allStationsConfigured && parsed.phase === 'monitoring') {
            // Auto-navigate to monitoring if all stations are configured and we were in monitoring
            console.log('ZvvApp: All stations configured, auto-loading to monitoring phase');
            setAppState({ ...parsed, phase: 'monitoring' });
          } else {
            console.log('ZvvApp: Loading saved state as-is');
            setAppState(parsed);
          }
        } else {
          console.log('ZvvApp: No saved state found, using initial state');
        }
      } catch (error) {
        console.error('ZvvApp: Error loading saved state:', error);
        toast({
          title: "Fehler",
          description: "Gespeicherte Daten konnten nicht geladen werden.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedState();
  }, []); // Empty dependency array - only run once on mount

  // Save state to sessionStorage - only when not loading
  useEffect(() => {
    if (isLoading) {
      console.log('ZvvApp: Skipping save during loading phase');
      return;
    }

    try {
      const stateToSave = JSON.stringify(appState);
      console.log('ZvvApp: Saving state to sessionStorage:', stateToSave);
      sessionStorage.setItem('zvv-app-state', stateToSave);
    } catch (error) {
      console.error('ZvvApp: Error saving state:', error);
    }
  }, [appState, isLoading]);

  const handleCountSelect = (count: number) => {
    console.log('ZvvApp: Count selected:', count);
    setAppState(prev => ({
      ...prev,
      stationCount: count,
      stations: Array.from({ length: count }, (_, i) => 
        prev.stations[i] || { id: '', name: '', customName: '', lineColors: {} }
      ),
      phase: 'station-selection'
    }));
  };

  const handleStationChange = (index: number, stationId: string, stationName: string) => {
    console.log('ZvvApp: Station changed at index', index, ':', { stationId, stationName });
    setAppState(prev => {
      const newStations = [...prev.stations];
      newStations[index] = { 
        id: stationId, 
        name: stationName, 
        customName: newStations[index]?.customName || '',
        lineColors: newStations[index]?.lineColors || {}
      };
      return {
        ...prev,
        stations: newStations
      };
    });
  };

  const handleStationUpdate = (index: number, updates: Partial<StationConfig>) => {
    console.log('ZvvApp: Station updated at index', index, ':', updates);
    setAppState(prev => {
      const newStations = [...prev.stations];
      newStations[index] = { ...newStations[index], ...updates };
      return {
        ...prev,
        stations: newStations
      };
    });
  };

  const handleToCustomization = () => {
    console.log('ZvvApp: Moving to customization phase');
    setAppState(prev => ({
      ...prev,
      phase: 'customization'
    }));
  };

  const handleToMonitoring = () => {
    console.log('ZvvApp: Moving to monitoring phase');
    setAppState(prev => ({
      ...prev,
      phase: 'monitoring'
    }));
  };

  const canProceed = appState.stations.length === appState.stationCount && 
                    appState.stations.every(station => station.id && station.name);

  const handleBack = () => {
    console.log('ZvvApp: Back button clicked, current phase:', appState.phase);
    if (appState.phase === 'station-selection') {
      setAppState(prev => ({ ...prev, phase: 'count-selection' }));
    } else if (appState.phase === 'customization') {
      setAppState(prev => ({ ...prev, phase: 'station-selection' }));
    } else if (appState.phase === 'monitoring') {
      setAppState(prev => ({ ...prev, phase: 'customization' }));
    }
  };

  const handleReconfigure = () => {
    console.log('ZvvApp: Reconfigure button clicked');
    setAppState(prev => ({ ...prev, phase: 'count-selection' }));
  };

  // Show loading state briefly to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground font-mono">Lade Anwendung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-primary font-mono tracking-wider">ZVV ABFAHRTSZEITEN</h1>
          <p className="text-muted-foreground font-mono text-lg uppercase tracking-wide">Live-Anzeige für mehrere Stationen</p>
        </header>

        <main>
          {appState.phase === 'count-selection' && (
            <StationCountSelector 
              selectedCount={appState.stationCount}
              onCountSelect={handleCountSelect}
            />
          )}

          {appState.phase === 'station-selection' && (
            <div className="space-y-8">
              <StationSelection
                stationCount={appState.stationCount}
                stations={appState.stations}
                onStationChange={handleStationChange}
                onNext={handleToCustomization}
                canProceed={canProceed}
              />
              <div className="text-center">
                <button
                  onClick={handleBack}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg font-bold px-8 py-4 text-lg font-mono rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--primary))'
                  }}
                >
                  <ChevronLeft className="h-5 w-5 mr-2 inline" />
                  ZURÜCK ZUR STATIONSANZAHL
                </button>
              </div>
            </div>
          )}

          {appState.phase === 'customization' && (
            <div className="space-y-8">
              <StationCustomization
                stations={appState.stations}
                onStationUpdate={handleStationUpdate}
                onNext={handleToMonitoring}
              />
              <div className="text-center">
                <button
                  onClick={handleBack}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg font-bold px-8 py-4 text-lg font-mono rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--primary))'
                  }}
                >
                  <ChevronLeft className="h-5 w-5 mr-2 inline" />
                  ZURÜCK ZUR STATIONSAUSWAHL
                </button>
              </div>
            </div>
          )}

          {appState.phase === 'monitoring' && (
            <div className="space-y-8">
              <DepartureBoard stations={appState.stations} />
              <div className="text-center">
                <button
                  onClick={handleReconfigure}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg font-bold px-8 py-4 text-lg font-mono rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--primary))'
                  }}
                >
                  <ChevronLeft className="h-5 w-5 mr-2 inline" />
                  STATIONEN NEU KONFIGURIEREN
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="text-center mt-12 text-sm text-muted-foreground font-mono">
          <p>DATEN VON TRANSPORT.OPENDATA.CH</p>
        </footer>
      </div>
    </div>
  );
}
