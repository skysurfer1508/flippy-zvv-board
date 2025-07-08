
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
  country?: string;
}

export function StationInput({ label, value, onChange, placeholder, country = 'switzerland' }: StationInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Synchronize query with value prop
  useEffect(() => {
    console.log(`StationInput[${country}]: value prop changed to:`, value);
    if (value !== query) {
      setQuery(value);
    }
  }, [value, country]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length >= 2) {
      console.log(`StationInput[${country}]: Starting search for:`, query);
      setIsLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log(`StationInput[${country}]: Executing API call for:`, query);
          const response = await ZvvApi.searchStations(query, country);
          console.log(`StationInput[${country}]: API response:`, response);
          
          const stationsArray = response.stations || [];
          console.log(`StationInput[${country}]: Processed ${stationsArray.length} stations:`, stationsArray);
          
          setSuggestions(stationsArray.slice(0, 8));
          setShowSuggestions(stationsArray.length > 0);
        } catch (error) {
          console.error(`StationInput[${country}]: Error fetching suggestions:`, error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      console.log(`StationInput[${country}]: Query too short, clearing suggestions`);
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`StationInput[${country}]: Input changed to:`, newValue);
    setQuery(newValue);
  };

  const handleSuggestionClick = (station: Location) => {
    console.log(`StationInput[${country}]: Station selected:`, station);
    setQuery(station.name);
    onChange(station.id, station.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Focus back to input for better UX
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log(`StationInput[${country}]: Input blur event`);
    
    // Improved cross-browser blur handling
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    // Check if blur is caused by clicking on suggestion
    if (relatedTarget && relatedTarget.closest('[data-suggestion]')) {
      console.log(`StationInput[${country}]: Blur caused by suggestion click, keeping suggestions open`);
      return;
    }
    
    // Enhanced delay for better cross-browser compatibility
    setTimeout(() => {
      console.log(`StationInput[${country}]: Hiding suggestions after blur delay`);
      setShowSuggestions(false);
    }, 150);
  };

  const handleInputFocus = () => {
    console.log(`StationInput[${country}]: Input focus event, suggestions available:`, suggestions.length);
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
            {suggestions.map((station, index) => (
              <button
                key={`${station.id}-${index}`}
                data-suggestion="true"
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors focus:bg-accent focus:text-accent-foreground focus:outline-none"
                onClick={() => handleSuggestionClick(station)}
                onMouseDown={(e) => {
                  // Prevent input blur when clicking suggestion
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Enhanced mobile compatibility
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
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground mt-1">
          Debug: Country={country}, Query="{query}", Suggestions={suggestions.length}, Show={showSuggestions.toString()}
        </div>
      )}
    </div>
  );
}
