
import { useState } from "react";
import { StationInput } from "./StationInput";
import { StationConfig } from "@/types/zvv";
import { ChevronRight } from "lucide-react";

interface StationSelectionProps {
  stationCount: number;
  stations: StationConfig[];
  onStationChange: (index: number, stationId: string, stationName: string) => void;
  onNext: () => void;
  canProceed: boolean;
}

export function StationSelection({
  stationCount,
  stations,
  onStationChange,
  onNext,
  canProceed
}: StationSelectionProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 text-primary font-mono">
          STATIONEN AUSWÄHLEN
        </h2>
        <p className="text-muted-foreground font-mono">
          Wähle {stationCount} Station{stationCount > 1 ? 'en' : ''} für die Abfahrtszeiten-Anzeige
        </p>
      </div>

      <div className="space-y-6">
        {Array.from({ length: stationCount }, (_, index) => (
          <div key={index} className="bg-card rounded-lg p-6 border border-border">
            <h3 className="text-lg font-medium mb-4 text-foreground font-mono">
              STATION {index + 1}
            </h3>
            <StationInput
              label={`Station ${index + 1}`}
              value={stations[index]?.name || ''}
              onChange={(stationId, stationName) => onStationChange(index, stationId, stationName)}
              placeholder={`Station ${index + 1} suchen...`}
            />
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`font-bold px-8 py-4 text-lg font-mono rounded-lg transition-all duration-200 ${
            canProceed 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg hover:scale-105' 
              : 'bg-muted text-muted-foreground border-2 border-muted cursor-not-allowed'
          }`}
          style={canProceed ? {
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderColor: 'hsl(var(--primary))'
          } : {}}
        >
          WEITER ZUR ANPASSUNG
          <ChevronRight className="h-5 w-5 ml-2 inline" />
        </button>
      </div>
    </div>
  );
}
