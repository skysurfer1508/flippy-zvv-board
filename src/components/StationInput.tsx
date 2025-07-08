
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ZvvApi } from "@/services/zvvApi";
import { Location } from "@/types/zvv";
import { Loader } from "lucide-react";

interface StationInputProps {
  label: string;
  value: string;
  onChange: (stationId: string, stationName: string) => void;
  placeholder?: string;
}

export function StationInput({ label, value, onChange, placeholder }: StationInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length >= 2) {
      setIsLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await ZvvApi.searchStations(query);
          setSuggestions(response.stations.slice(0, 8));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
  };

  const handleSuggestionClick = (station: Location) => {
    setQuery(station.name);
    onChange(station.id, station.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className="relative">
      <Label htmlFor={`station-${label}`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={`station-${label}`}
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder || "Station eingeben..."}
          className="w-full"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <div className="p-1">
            {suggestions.map((station) => (
              <button
                key={station.id}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSuggestionClick(station);
                }}
              >
                <div className="font-medium">{station.name}</div>
                {station.id && (
                  <div className="text-xs text-muted-foreground">ID: {station.id}</div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
