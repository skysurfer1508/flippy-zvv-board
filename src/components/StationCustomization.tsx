
import { useState, useEffect } from "react";
import { StationConfig, Departure } from "@/types/zvv";
import { ZvvApi } from "@/services/zvvApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Palette, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StationCustomizationProps {
  stations: StationConfig[];
  onStationUpdate: (index: number, updates: Partial<StationConfig>) => void;
  onNext: () => void;
}

interface LineInfo {
  number: string;
  category: string;
  color: string;
}

export function StationCustomization({ 
  stations, 
  onStationUpdate, 
  onNext 
}: StationCustomizationProps) {
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [availableLines, setAvailableLines] = useState<Record<string, LineInfo[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  const currentStation = stations[currentStationIndex];

  // Initialize custom names from station data
  useEffect(() => {
    const names: Record<string, string> = {};
    stations.forEach((station, index) => {
      names[index.toString()] = station.customName || station.name;
    });
    setCustomNames(names);
  }, [stations]);

  // Load available lines for current station
  useEffect(() => {
    if (!currentStation) return;

    const loadLines = async () => {
      if (availableLines[currentStation.id]) return; // Already loaded

      setIsLoading(true);
      try {
        const response = await ZvvApi.getStationBoard(currentStation.id);
        if (response?.stationboard) {
          const lines: LineInfo[] = [];
          const seenLines = new Set<string>();
          
          response.stationboard.forEach((departure: Departure) => {
            const lineNumber = departure.number || departure.name;
            const key = `${lineNumber}-${departure.category}`;
            
            if (!seenLines.has(key)) {
              seenLines.add(key);
              lines.push({
                number: lineNumber,
                category: departure.category,
                color: getDefaultLineColor(departure.category)
              });
            }
          });

          setAvailableLines(prev => ({
            ...prev,
            [currentStation.id]: lines
          }));
        }
      } catch (error) {
        console.error('Error loading lines:', error);
        toast({
          title: "Fehler",
          description: "Linien konnten nicht geladen werden.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLines();
  }, [currentStation, availableLines]);

  const getDefaultLineColor = (category: string): string => {
    const cat = category.toLowerCase();
    if (cat.includes('tram') || cat.includes('str')) return '#4ecdc4';
    if (cat.includes('bus')) return '#ff6b6b';
    if (cat.includes('train') || cat.includes('s')) return '#ffd700';
    return '#gray-600';
  };

  const handleNameChange = (value: string) => {
    setCustomNames(prev => ({
      ...prev,
      [currentStationIndex.toString()]: value
    }));
    
    onStationUpdate(currentStationIndex, {
      customName: value
    });
  };

  const handleLineColorChange = (lineNumber: string, color: string) => {
    const currentColors = currentStation.lineColors || {};
    const updatedColors = {
      ...currentColors,
      [lineNumber]: color
    };
    
    onStationUpdate(currentStationIndex, {
      lineColors: updatedColors
    });
  };

  const handleNextStation = () => {
    if (currentStationIndex < stations.length - 1) {
      setCurrentStationIndex(currentStationIndex + 1);
    } else {
      onNext();
    }
  };

  const handlePreviousStation = () => {
    if (currentStationIndex > 0) {
      setCurrentStationIndex(currentStationIndex - 1);
    }
  };

  const currentLines = availableLines[currentStation.id] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 text-primary font-mono">
          STATION ANPASSEN
        </h2>
        <p className="text-muted-foreground font-mono">
          Station {currentStationIndex + 1} von {stations.length}: {currentStation.name}
        </p>
      </div>

      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="space-y-6">
          {/* Station Name Customization */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground font-mono">
              ANZEIGENAME FÜR STATION
            </label>
            <Input
              value={customNames[currentStationIndex.toString()] || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={currentStation.name}
              className="font-mono"
            />
          </div>

          {/* Line Colors Customization */}
          <div>
            <div className="flex items-center mb-4">
              <Palette className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium text-foreground font-mono">
                LINIENFARBEN ANPASSEN
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground font-mono">
                  Lade verfügbare Linien...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentLines.map((line) => (
                  <div
                    key={`${line.number}-${line.category}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-6 h-6 rounded border-2 border-border"
                        style={{
                          backgroundColor: currentStation.lineColors?.[line.number] || line.color
                        }}
                      />
                      <div>
                        <div className="font-mono font-bold text-sm">
                          {line.number}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground uppercase">
                          {line.category}
                        </div>
                      </div>
                    </div>
                    <input
                      type="color"
                      value={currentStation.lineColors?.[line.number] || line.color}
                      onChange={(e) => handleLineColorChange(line.number, e.target.value)}
                      className="w-10 h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && currentLines.length === 0 && (
              <p className="text-center text-muted-foreground font-mono py-8">
                Keine Linien verfügbar oder Daten konnten nicht geladen werden.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePreviousStation}
          disabled={currentStationIndex === 0}
          className="font-mono"
        >
          VORHERIGE STATION
        </Button>

        <div className="flex space-x-2">
          {stations.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentStationIndex
                  ? 'bg-primary'
                  : index < currentStationIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNextStation}
          className="font-mono"
        >
          {currentStationIndex < stations.length - 1 ? 'NÄCHSTE STATION' : 'FERTIG'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
