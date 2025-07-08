import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Loader, Clock, AlertCircle } from "lucide-react";
import { ZvvApi } from "@/services/zvvApi";
import { StationConfig, Departure, SupportedLanguage } from "@/types/zvv";
import { useTranslations } from "@/utils/translations";
import { FlipDotRow } from "./FlipDotRow";
import { useDynamicEntries } from "@/hooks/use-dynamic-entries";

interface DepartureBoardProps {
  stations: StationConfig[];
  language: SupportedLanguage;
  theme?: string;
  isFullscreen?: boolean;
}

interface StationBoardData {
  stationId: string;
  stationName: string;
  customName?: string;
  lineColors?: Record<string, string>;
  departures: Departure[];
}

export function DepartureBoard({ stations, language, theme, isFullscreen = false }: DepartureBoardProps) {
  const { t } = useTranslations(language);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Check if LED theme is active
  const isLedTheme = theme === 'led';

  // Use the new dynamic entries hook
  const maxEntries = useDynamicEntries({
    isFullscreen,
    isLedTheme
  });

  // Manage fullscreen body class
  useEffect(() => {    
    // Add or remove fullscreen body class
    if (isFullscreen) {
      document.body.classList.add('fullscreen-mode');
    } else {
      document.body.classList.remove('fullscreen-mode');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('fullscreen-mode');
    };
  }, [isFullscreen]);

  const { data: departureData, isLoading, error, refetch } = useQuery({
    queryKey: ['departures', stations.map(s => s.id)],
    queryFn: async (): Promise<StationBoardData[]> => {
      const results = await Promise.all(
        stations.map(async (station) => {
          const response = await ZvvApi.getStationBoard(station.id);
          return {
            stationId: station.id,
            stationName: station.name,
            customName: station.customName,
            lineColors: station.lineColors,
            departures: response?.stationboard || []
          };
        })
      );
      return results;
    },
    refetchInterval: 20000,
    enabled: stations.length > 0
  });

  useEffect(() => {
    if (departureData) {
      setLastUpdated(new Date());
    }
  }, [departureData]);

  const formatDepartureTime = (departure: Departure) => {
    if (!departure.stop.departure) return "N/A";
    
    const departureTime = new Date(departure.stop.departure);
    const now = new Date();
    const diffMinutes = Math.round((departureTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 0) return t.now;
    if (diffMinutes < 60) return `${diffMinutes}'`;
    
    return departureTime.toLocaleTimeString(language === 'en' ? 'en-US' : 'de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getLineColor = (category: string, lineNumber: string, customColors?: Record<string, string>) => {
    if (customColors && customColors[lineNumber]) {
      return customColors[lineNumber];
    }
    
    const cat = category.toLowerCase();
    if (cat.includes('tram') || cat.includes('str')) return '#4ecdc4';
    if (cat.includes('bus')) return '#ff6b6b';
    if (cat.includes('train') || cat.includes('s')) return '#ffd700';
    return '#6b7280';
  };

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString(language === 'en' ? 'en-US' : 'de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-background">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-foreground font-mono">{t.loadingDepartures}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background border border-destructive rounded-lg">
        <div className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-destructive font-mono">{t.errorLoadingDepartures}</p>
            <button 
              onClick={() => refetch()}
              className="text-primary hover:text-primary/80 underline font-mono"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LED Theme - Flip-dot display
  if (isLedTheme) {
    return (
      <div className="space-y-8">
        {departureData?.map((stationData) => (
          <div key={stationData.stationId} className={`flip-dot-display ${isFullscreen ? 'fullscreen-flip-dot' : ''}`}>
            <div className="flip-dot-header">
              <div className="text-center">
                {stationData.customName || stationData.stationName}
              </div>
            </div>

            <div 
              role="list" 
              aria-live="polite"
              aria-label={`Abfahrten von ${stationData.customName || stationData.stationName}`}
              className="flex-1 overflow-hidden"
            >
              {stationData.departures.length === 0 ? (
                <div className="flip-dot-row">
                  <div></div>
                  <div className="flip-dot-destination">{t.noDataAvailable}</div>
                  <div></div>
                </div>
              ) : (
                stationData.departures.slice(0, maxEntries).map((departure, index) => (
                  <FlipDotRow
                    key={`${departure.name}-${departure.stop.departure}-${index}`}
                    departure={departure}
                    formatTime={formatDepartureTime}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default theme layout
  return (
    <div className="space-y-8">
      {departureData?.map((stationData) => (
        <div key={stationData.stationId} className={`zvv-board rounded-lg overflow-hidden border border-border ${isFullscreen ? 'fullscreen-board' : ''}`}>
          {/* Station Header */}
          <div className="zvv-header px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold font-mono">
              {stationData.customName || stationData.stationName}
            </h2>
            <div className="flex flex-col items-end">
              <div className="flex items-center text-sm font-mono zvv-live-indicator">
                <Clock className="h-4 w-4 mr-2" />
                LIVE
              </div>
              <div className="text-xs font-mono opacity-80 mt-1">
                {formatLastUpdated()}
              </div>
            </div>
          </div>

          {/* Departure Table */}
          <div className="bg-background">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted border-b border-border font-mono text-sm font-bold uppercase tracking-wider">
              <div className="col-span-2">Linie</div>
              <div className="col-span-6">Richtung</div>
              <div className="col-span-2">{t.platform}</div>
              <div className="col-span-2 text-right">Abfahrt</div>
            </div>

            {/* Departure Rows */}
            {stationData.departures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono">
                {t.noDataAvailable}
              </div>
            ) : (
              <div className={`${isFullscreen ? 'fullscreen-departures' : 'max-h-96 overflow-y-auto'}`}>
                {stationData.departures.slice(0, maxEntries).map((departure, index) => {
                  const lineNumber = departure.number || departure.name;
                  const lineColor = getLineColor(departure.category, lineNumber, stationData.lineColors);
                  
                  // Enhanced delay parsing with strict type checking
                  const delayValue = departure.stop.delay;
                  const delayNumber = delayValue ? Number(delayValue) : 0;
                  const hasDelay = delayNumber > 0;
                  
                  console.log('DepartureBoard delay processing:', {
                    lineNumber,
                    delayValue,
                    delayNumber,
                    hasDelay,
                    delayType: typeof delayValue
                  });
                  
                  return (
                    <div
                      key={`${departure.name}-${departure.stop.departure}-${index}`}
                      className="zvv-departure-row grid grid-cols-12 gap-2 px-6 py-4 hover:bg-muted transition-colors departure-item"
                    >
                      {/* Line Number */}
                      <div className="col-span-2 flex items-center">
                        <span 
                          className="line-number text-white px-3 py-1 rounded text-xs font-bold min-w-[3rem] text-center"
                          style={{ backgroundColor: lineColor }}
                        >
                          {lineNumber}
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="col-span-6 flex flex-col justify-center">
                        <div className="destination font-mono font-bold text-foreground truncate">
                          {departure.to}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground uppercase">
                          {departure.category}
                        </div>
                      </div>

                      {/* Platform */}
                      <div className="col-span-2 flex items-center justify-center">
                        {departure.stop.platform && (
                          <span className="platform font-mono font-bold text-primary">
                            {departure.stop.platform}
                          </span>
                        )}
                      </div>

                      {/* Departure Time */}
                      <div className="col-span-2 flex flex-col items-end justify-center">
                        <div className="departure-time font-mono font-bold text-lg text-primary">
                          {formatDepartureTime(departure)}
                        </div>
                        {/* Always render delay container for consistent spacing */}
                        <div className="delay-container" style={{ minHeight: '1.25rem' }}>
                          {hasDelay ? (
                            <div className="delay font-mono text-xs text-destructive">
                              +{delayNumber}'
                            </div>
                          ) : (
                            <div className="delay font-mono text-xs text-transparent">
                              &nbsp;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
