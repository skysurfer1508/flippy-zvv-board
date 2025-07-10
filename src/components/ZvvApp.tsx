
import { useState, useEffect } from "react";
import { StationCountSelector } from "./StationCountSelector";
import { StationSelection } from "./StationSelection";
import { StationCustomization } from "./StationCustomization";
import { DepartureBoard } from "./DepartureBoard";
import { SettingsMenu } from "./SettingsMenu";
import { CountrySelection } from "./CountrySelection";
import { AppState, StationConfig, SupportedLanguage, Theme, Country } from "@/types/zvv";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "@/utils/translations";

const INITIAL_STATE: AppState = {
  country: 'switzerland',
  stationCount: 2,
  stations: [],
  customColors: {
    tram: '#4ecdc4',
    bus: '#ff6b6b', 
    train: '#ffd700'
  },
  phase: 'country-selection',
  language: 'de',
  theme: 'default',
  isFullscreen: false
};

export function ZvvApp() {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const { t, formatStationSubtitle } = useTranslations(appState.language);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        console.log('ZvvApp: Loading saved state from sessionStorage...');
        const savedState = sessionStorage.getItem('zvv-app-state');
        
        if (savedState) {
          const parsed = JSON.parse(savedState);
          console.log('ZvvApp: Parsed saved state:', parsed);
          
          if (!parsed.language) {
            parsed.language = 'de';
          }
          
          if (!parsed.theme) {
            parsed.theme = 'default';
          }

          if (!parsed.country) {
            parsed.country = 'switzerland';
          }

          if (parsed.isFullscreen === undefined) {
            parsed.isFullscreen = false;
          }

          // Remove fontSize from saved state if it exists
          if (parsed.fontSize) {
            delete parsed.fontSize;
          }
          
          const hasValidStations = parsed.stations?.length === parsed.stationCount;
          const allStationsConfigured = hasValidStations && 
                                      parsed.stations.every((station: StationConfig) => 
                                        station.id && station.name && station.id.trim() !== '' && station.name.trim() !== ''
                                      );
          
          console.log('ZvvApp: Validation - hasValidStations:', hasValidStations, 'allStationsConfigured:', allStationsConfigured);
          
          if (allStationsConfigured && parsed.phase === 'monitoring') {
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
  }, []);

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

  const handleCountrySelect = (country: string) => {
    console.log('ZvvApp: Country selected:', country);
    setAppState(prev => ({
      ...prev,
      country: country as Country,
      phase: 'count-selection'
    }));
  };

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
        lineColors: newStations[index]?.lineColors || {},
        lineDirections: newStations[index]?.lineDirections || {}
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

  const handleLanguageChange = (language: SupportedLanguage) => {
    console.log('ZvvApp: Language changed to:', language);
    setAppState(prev => ({
      ...prev,
      language
    }));
  };

  const handleThemeChange = (theme: Theme) => {
    console.log('ZvvApp: Theme changed to:', theme);
    setAppState(prev => ({
      ...prev,
      theme
    }));
  };

  const handleReconfigure = () => {
    console.log('ZvvApp: Reconfigure button clicked');
    setAppState(prev => ({ ...prev, phase: 'count-selection' }));
  };

  const handleChangeCountry = () => {
    console.log('ZvvApp: Change country button clicked');
    setAppState(prev => ({ ...prev, phase: 'country-selection' }));
  };

  const handleFullscreenToggle = () => {
    console.log('ZvvApp: Fullscreen toggled:', !appState.isFullscreen);
    setAppState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
  };

  const canProceed = appState.stations.length === appState.stationCount && 
                    appState.stations.every(station => station.id && station.name);

  const handleBack = () => {
    console.log('ZvvApp: Back button clicked, current phase:', appState.phase);
    if (appState.phase === 'count-selection') {
      setAppState(prev => ({ ...prev, phase: 'country-selection' }));
    } else if (appState.phase === 'station-selection') {
      setAppState(prev => ({ ...prev, phase: 'count-selection' }));
    } else if (appState.phase === 'customization') {
      setAppState(prev => ({ ...prev, phase: 'station-selection' }));
    } else if (appState.phase === 'monitoring') {
      setAppState(prev => ({ ...prev, phase: 'customization' }));
    }
  };

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

  const getThemeClass = () => {
    switch (appState.theme) {
      case 'led': return 'theme-led';
      case 'blackwhite': return 'theme-blackwhite';
      case 'modern': return 'theme-modern';
      case 'classic': return 'theme-classic';
      default: return '';
    }
  };

  return (
    <div className={`min-h-screen bg-background ${appState.isFullscreen ? 'p-2' : 'p-4'} ${getThemeClass()}`}>
      <div className="container mx-auto max-w-6xl">
        {!appState.isFullscreen && (
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 text-primary font-mono tracking-wider">{t.appTitle}</h1>
            <p className="text-muted-foreground font-mono text-lg uppercase tracking-wide">{t.appSubtitle}</p>
          </header>
        )}

        <main>
          {appState.phase === 'country-selection' && (
            <CountrySelection
              selectedCountry={appState.country}
              language={appState.language}
              onCountrySelect={handleCountrySelect}
            />
          )}

          {appState.phase === 'count-selection' && (
            <div className="space-y-8">
              <StationCountSelector 
                selectedCount={appState.stationCount}
                onCountSelect={handleCountSelect}
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
                  {t.backToCountrySelection || 'Zurück zur Länderauswahl'}
                </button>
              </div>
            </div>
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
                  {t.backToStationCount}
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
                  {t.backToStationSelection}
                </button>
              </div>
            </div>
          )}

          {appState.phase === 'monitoring' && (
            <div className="space-y-8">
              <DepartureBoard 
                stations={appState.stations} 
                language={appState.language}
                theme={appState.theme}
                isFullscreen={appState.isFullscreen}
              />
              
              <SettingsMenu 
                language={appState.language}
                theme={appState.theme}
                isFullscreen={appState.isFullscreen}
                onLanguageChange={handleLanguageChange}
                onThemeChange={handleThemeChange}
                onFullscreenToggle={handleFullscreenToggle}
                onReconfigureStations={handleReconfigure}
                onEditColors={() => setAppState(prev => ({ ...prev, phase: 'customization' }))}
                onChangeCountry={handleChangeCountry}
              />
            </div>
          )}
        </main>

        {!appState.isFullscreen && (
          <footer className="text-center mt-12 text-sm text-muted-foreground font-mono">
            <p>{t.dataFrom}</p>
          </footer>
        )}
      </div>
    </div>
  );
}
