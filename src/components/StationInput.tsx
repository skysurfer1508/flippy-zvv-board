
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

  // Synchronize query with value prop for cross-browser compatibility
  useEffect(() => {
    console.log('StationInput: value prop changed to:', value);
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length >= 2) {
      setIsLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log('StationInput: Searching for:', query);
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
    console.log('StationInput: Input changed to:', newValue);
    setQuery(newValue);
  };

  const handleSuggestionClick = (station: Location) => {
    console.log('StationInput: Station selected:', station);
    setQuery(station.name);
    onChange(station.id, station.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Cross-browser event handling with fallback
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    // Check if blur is caused by clicking on suggestion
    if (relatedTarget && relatedTarget.closest('[data-suggestion]')) {
      return;
    }
    
    // Delay hiding suggestions to allow clicks - cross-browser compatible
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
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
          onFocus={handleInputFocus}
          placeholder={placeholder || "Station eingeben..."}
          className="w-full"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-64 overflow-y-auto bg-background border shadow-lg">
          <div className="p-1">
            {suggestions.map((station) => (
              <button
                key={station.id}
                data-suggestion="true"
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors focus:bg-accent focus:text-accent-foreground focus:outline-none"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSuggestionClick(station);
                }}
                onTouchStart={(e) => {
                  // Mobile Safari compatibility
                  e.preventDefault();
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
