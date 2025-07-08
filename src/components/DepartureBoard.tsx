
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    refetchInterval: 30000, // Refresh every 30 seconds
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
    if (cat.includes('tram') || cat.includes('str')) return 'bg-blue-500';
    if (cat.includes('bus')) return 'bg-red-500';
    if (cat.includes('train') || cat.includes('s')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Lade Abfahrtszeiten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-destructive">Fehler beim Laden der Abfahrtszeiten</p>
            <button 
              onClick={() => refetch()}
              className="text-primary hover:text-primary/80 underline"
            >
              Nochmals versuchen
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {departureData?.map((stationData) => (
        <Card key={stationData.stationId} className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>{stationData.stationName}</span>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Live
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stationData.departures.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Keine Abfahrten verfügbar
              </p>
            ) : (
              <div className="space-y-2">
                {stationData.departures.slice(0, 8).map((departure, index) => (
                  <div
                    key={`${departure.name}-${departure.stop.departure}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge 
                        className={`${getLineColor(departure.category)} text-white font-bold min-w-[3rem] justify-center`}
                      >
                        {departure.number || departure.name}
                      </Badge>
                      <div>
                        <p className="font-medium">{departure.to}</p>
                        <p className="text-sm text-muted-foreground">
                          {departure.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg">
                        {formatDepartureTime(departure)}
                      </p>
                      {departure.stop.delay && departure.stop.delay > 0 && (
                        <p className="text-xs text-destructive">
                          +{departure.stop.delay}'
                        </p>
                      )}
                      {departure.stop.platform && (
                        <p className="text-xs text-muted-foreground">
                          Gleis {departure.stop.platform}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
