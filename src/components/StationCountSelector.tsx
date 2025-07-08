
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StationCountSelectorProps {
  selectedCount: number;
  onCountSelect: (count: number) => void;
}

export function StationCountSelector({ selectedCount, onCountSelect }: StationCountSelectorProps) {
  const counts = [1, 2, 3, 4, 5, 6];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Anzahl Stationen wählen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {counts.map((count) => (
            <Button
              key={count}
              variant={selectedCount === count ? "default" : "outline"}
              onClick={() => onCountSelect(count)}
              className="h-12 text-lg"
            >
              {count}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
