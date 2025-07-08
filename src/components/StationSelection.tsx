
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StationInput } from "./StationInput";
import { StationConfig } from "@/types/zvv";

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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Stationen auswählen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: stationCount }, (_, index) => (
          <StationInput
            key={index}
            label={`Station ${index + 1}`}
            value={stations[index]?.name || ""}
            onChange={(stationId, stationName) => onStationChange(index, stationId, stationName)}
            placeholder={`Station ${index + 1} eingeben...`}
          />
        ))}
        
        <div className="flex justify-center pt-4">
          <Button 
            onClick={onNext}
            disabled={!canProceed}
            size="lg"
          >
            Weiter zur Anpassung
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
