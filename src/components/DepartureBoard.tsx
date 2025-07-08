
import { useQuery } from "@tanstack/react-query";
import { Loader, Clock, AlertCircle } from "lucide-react";
import { ZvvApi } from "@/services/zvvApi";
import { StationConfig, Departure } from "@/types/zvv";

interface DepartureBoardProps {
  stations: StationConfig[];
}

interface StationBoardData {
  stationId: string;
  stationName: string;
  departures: Departure[];
}

export function DepartureBoard({ stations }: DepartureBoardProps) {
  const { data: departureData, isLoading, error, refetch } = useQuery({
    queryKey: ['departures', stations.map(s => s.id)],
    queryFn: async (): Promise<StationBoardData[]> => {
      const results = await Promise.all(
        stations.map(async (station) => {
          const response = await ZvvApi.getStationBoard(station.id);
          return {
            stationId: station.id,
            stationName: station.name,
            departures: response?.stationboard || []
          };
        })
      );
      return results;
    },
    refetchInterval: 30000,
    enabled: stations.length > 0
  });

  const formatDepartureTime = (departure: Departure) => {
    if (!departure.stop.departure) return "N/A";
    
    const departureTime = new Date(departure.stop.departure);
    const now = new Date();
    const diffMinutes = Math.round((departureTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 0) return "Jetzt";
    if (diffMinutes < 60) return `${diffMinutes}'`;
    
    return departureTime.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getLineColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('tram') || cat.includes('str')) return 'bg-blue-600';
    if (cat.includes('bus')) return 'bg-red-600';
    if (cat.includes('train') || cat.includes('s')) return 'bg-green-600';
    return 'bg-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-background">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-foreground font-mono">Lade Abfahrtszeiten...</p>
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
            <p className="text-destructive font-mono">Fehler beim Laden der Abfahrtszeiten</p>
            <button 
              onClick={() => refetch()}
              className="text-primary hover:text-primary/80 underline font-mono"
            >
              Nochmals versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {departureData?.map((stationData) => (
        <div key={stationData.stationId} className="zvv-board rounded-lg overflow-hidden border border-border">
          {/* Station Header */}
          <div className="zvv-header px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold font-mono">{stationData.stationName}</h2>
            <div className="flex items-center text-sm font-mono zvv-live-indicator">
              <Clock className="h-4 w-4 mr-2" />
              LIVE
            </div>
          </div>

          {/* Departure Table */}
          <div className="bg-background">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted border-b border-border font-mono text-sm font-bold uppercase tracking-wider">
              <div className="col-span-2">Linie</div>
              <div className="col-span-6">Richtung</div>
              <div className="col-span-2">Gl.</div>
              <div className="col-span-2 text-right">Abfahrt</div>
            </div>

            {/* Departure Rows */}
            {stationData.departures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono">
                Keine Abfahrten verfügbar
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {stationData.departures.slice(0, 10).map((departure, index) => (
                  <div
                    key={`${departure.name}-${departure.stop.departure}-${index}`}
                    className="zvv-departure-row grid grid-cols-12 gap-2 px-6 py-4 hover:bg-muted transition-colors"
                  >
                    {/* Line Number */}
                    <div className="col-span-2 flex items-center">
                      <span className={`zvv-line-number px-3 py-1 rounded text-xs font-bold min-w-[3rem] text-center ${getLineColor(departure.category)}`}>
                        {departure.number || departure.name}
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="col-span-6 flex flex-col justify-center">
                      <div className="font-mono font-bold text-foreground truncate">
                        {departure.to}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground uppercase">
                        {departure.category}
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="col-span-2 flex items-center justify-center">
                      {departure.stop.platform && (
                        <span className="font-mono font-bold text-primary">
                          {departure.stop.platform}
                        </span>
                      )}
                    </div>

                    {/* Departure Time */}
                    <div className="col-span-2 flex flex-col items-end justify-center">
                      <div className="font-mono font-bold text-lg text-primary">
                        {formatDepartureTime(departure)}
                      </div>
                      {departure.stop.delay && departure.stop.delay > 0 && (
                        <div className="font-mono text-xs text-destructive">
                          +{departure.stop.delay}'
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
