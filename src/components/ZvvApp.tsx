
import { useState, useEffect } from "react";
import { StationCountSelector } from "./StationCountSelector";
import { StationSelection } from "./StationSelection";
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

  // Load state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('zvv-app-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Validate that all required stations are configured
        const allStationsConfigured = parsed.stations?.length === parsed.stationCount && 
                                    parsed.stations.every((station: StationConfig) => station.id && station.name);
        
        if (allStationsConfigured && parsed.phase !== 'count-selection') {
          // Auto-load to monitoring phase if stations are configured
          setAppState(prev => ({ ...parsed, phase: 'monitoring' }));
        } else {
          setAppState(parsed);
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
        toast({
          title: "Fehler",
          description: "Gespeicherte Daten konnten nicht geladen werden.",
          variant: "destructive"
        });
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('zvv-app-state', JSON.stringify(appState));
  }, [appState]);

  const handleCountSelect = (count: number) => {
    setAppState(prev => ({
      ...prev,
      stationCount: count,
      stations: Array.from({ length: count }, (_, i) => 
        prev.stations[i] || { id: '', name: '', customName: '' }
      ),
      phase: 'station-selection'
    }));
  };

  const handleStationChange = (index: number, stationId: string, stationName: string) => {
    setAppState(prev => {
      const newStations = [...prev.stations];
      newStations[index] = { id: stationId, name: stationName, customName: '' };
      return {
        ...prev,
        stations: newStations
      };
    });
  };

  const handleNext = () => {
    setAppState(prev => ({
      ...prev,
      phase: 'monitoring'
    }));
  };

  const canProceed = appState.stations.length === appState.stationCount && 
                    appState.stations.every(station => station.id && station.name);

  const handleBack = () => {
    if (appState.phase === 'station-selection') {
      setAppState(prev => ({ ...prev, phase: 'count-selection' }));
    } else if (appState.phase === 'monitoring') {
      setAppState(prev => ({ ...prev, phase: 'station-selection' }));
    }
  };

  const handleReconfigure = () => {
    setAppState(prev => ({ ...prev, phase: 'count-selection' }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">ZVV Abfahrtszeiten</h1>
          <p className="text-muted-foreground">Live-Anzeige für mehrere Stationen</p>
        </header>

        <main>
          {appState.phase === 'count-selection' && (
            <StationCountSelector 
              selectedCount={appState.stationCount}
              onCountSelect={handleCountSelect}
            />
          )}

          {appState.phase === 'station-selection' && (
            <div className="space-y-6">
              <StationSelection
                stationCount={appState.stationCount}
                stations={appState.stations}
                onStationChange={handleStationChange}
                onNext={handleNext}
                canProceed={canProceed}
              />
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-primary hover:text-primary/80"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Zurück zur Stationsanzahl
                </Button>
              </div>
            </div>
          )}

          {appState.phase === 'monitoring' && (
            <div className="space-y-6">
              <DepartureBoard stations={appState.stations} />
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleReconfigure}
                  className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Stationen neu konfigurieren
                </Button>
              </div>
            </div>
          )}
        </main>

        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>Daten von transport.opendata.ch</p>
        </footer>
      </div>
    </div>
  );
}
