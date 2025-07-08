
import { useState, useEffect } from "react";
import { StationConfig, Departure } from "@/types/zvv";
import { ZvvApi } from "@/services/zvvApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader, Palette, ChevronRight, Check, X } from "lucide-react";
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

interface DirectionInfo {
  [lineNumber: string]: string[];
}

export function StationCustomization({ 
  stations, 
  onStationUpdate, 
  onNext 
}: StationCustomizationProps) {
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [availableLines, setAvailableLines] = useState<Record<string, LineInfo[]>>({});
  const [availableDirections, setAvailableDirections] = useState<Record<string, DirectionInfo>>({});
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
        const [boardResponse, directionsResponse] = await Promise.all([
          ZvvApi.getStationBoard(currentStation.id),
          ZvvApi.getLineDirections(currentStation.id)
        ]);
        
        if (boardResponse?.stationboard) {
          const lines: LineInfo[] = [];
          const seenLines = new Set<string>();
          
          boardResponse.stationboard.forEach((departure: Departure) => {
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

        setAvailableDirections(prev => ({
          ...prev,
          [currentStation.id]: directionsResponse
        }));
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

  // FIXED: Direction selection logic - now array contains SELECTED directions
  const handleDirectionChange = (lineNumber: string, directions: string[]) => {
    console.log(`Direction change for line ${lineNumber}:`, directions);
    const currentDirections = currentStation.lineDirections || {};
    const updatedDirections = {
      ...currentDirections,
      [lineNumber]: directions
    };
    
    onStationUpdate(currentStationIndex, {
      lineDirections: updatedDirections
    });
  };

  // FIXED: Select all means add all directions to the selected array
  const handleSelectAllDirections = (lineNumber: string) => {
    const allDirections = availableDirections[currentStation.id]?.[lineNumber] || [];
    console.log(`Selecting ALL directions for line ${lineNumber}:`, allDirections);
    handleDirectionChange(lineNumber, [...allDirections]);
  };

  // FIXED: Deselect all means empty the selected array
  const handleDeselectAllDirections = (lineNumber: string) => {
    console.log(`Deselecting ALL directions for line ${lineNumber}`);
    handleDirectionChange(lineNumber, []);
  };

  // FIXED: Direction is selected if it's in the selected array (or if array is empty = show all)
  const isDirectionSelected = (lineNumber: string, direction: string): boolean => {
    const selectedDirections = currentStation.lineDirections?.[lineNumber] || [];
    // If array is empty, show all directions (selected = true)
    // If array has items, check if this direction is in the selected list
    const isSelected = selectedDirections.length === 0 || selectedDirections.includes(direction);
    console.log(`Direction ${direction} for line ${lineNumber} selected:`, isSelected, 'selectedDirections:', selectedDirections);
    return isSelected;
  };

  // FIXED: Status calculation based on selected directions
  const getDirectionStatus = (lineNumber: string, totalDirections: number): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const selectedDirections = currentStation.lineDirections?.[lineNumber] || [];
    
    console.log(`Status for line ${lineNumber}:`, { selectedDirections, totalDirections });
    
    if (selectedDirections.length === 0) {
      // Empty array means show all directions
      return { text: 'Alle Richtungen', variant: 'default' };
    } else if (selectedDirections.length === totalDirections) {
      // All directions are selected
      return { text: 'Alle Richtungen', variant: 'default' };
    } else {
      // Some directions are selected
      return { text: `${selectedDirections.length} von ${totalDirections}`, variant: 'secondary' };
    }
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
  const currentDirections = availableDirections[currentStation.id] || {};

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

          {/* Direction Filter Section */}
          <div>
            <div className="flex items-center mb-4">
              <div className="h-5 w-5 mr-2 text-primary">→</div>
              <h3 className="text-lg font-medium text-foreground font-mono">
                RICHTUNGEN FILTERN
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="text-muted-foreground font-mono text-sm">
                  Lade Richtungen...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {currentLines.map((line) => {
                  const lineDirections = currentDirections[line.number] || [];
                  const selectedDirections = currentStation.lineDirections?.[line.number] || [];
                  const status = getDirectionStatus(line.number, lineDirections.length);
                  
                  if (lineDirections.length <= 1) return null; // Skip lines with only one direction
                  
                  return (
                    <div
                      key={`directions-${line.number}`}
                      className="p-4 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
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
                        <div className="flex items-center space-x-2">
                          <Badge variant={status.variant} className="font-mono text-xs">
                            {status.text}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectAllDirections(line.number)}
                            className="h-7 px-2 text-xs font-mono"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Alle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeselectAllDirections(line.number)}
                            className="h-7 px-2 text-xs font-mono"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Keine
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {lineDirections.map((direction) => {
                          const isSelected = isDirectionSelected(line.number, direction);
                          return (
                            <label
                              key={direction}
                              className={`flex items-center space-x-3 cursor-pointer rounded p-2 transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-primary/10 border border-primary/20 text-primary' 
                                  : 'hover:bg-background/50 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const currentSelected = selectedDirections.length === 0 ? [...lineDirections] : [...selectedDirections];
                                  let newSelected: string[];
                                  
                                  if (e.target.checked) {
                                    // User wants to select this direction (add to selected list if not already there)
                                    if (!currentSelected.includes(direction)) {
                                      newSelected = [...currentSelected, direction];
                                    } else {
                                      newSelected = currentSelected;
                                    }
                                  } else {
                                    // User wants to deselect this direction (remove from selected list)
                                    newSelected = currentSelected.filter(d => d !== direction);
                                  }
                                  
                                  console.log(`Checkbox change for ${direction}:`, {
                                    checked: e.target.checked,
                                    currentSelected,
                                    newSelected
                                  });
                                  
                                  handleDirectionChange(line.number, newSelected);
                                }}
                                className={`rounded border-2 ${
                                  isSelected 
                                    ? 'border-primary bg-primary text-primary-foreground' 
                                    : 'border-border'
                                }`}
                              />
                              <span className={`font-mono text-sm flex-1 ${
                                isSelected ? 'font-medium' : ''
                              }`}>
                                → {direction}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {currentLines.filter(line => (currentDirections[line.number]?.length || 0) > 1).length === 0 && (
                  <p className="text-center text-muted-foreground font-mono py-4 text-sm">
                    Keine Linien mit mehreren Richtungen gefunden.
                  </p>
                )}
              </div>
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
