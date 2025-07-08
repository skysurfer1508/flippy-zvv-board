
import { Departure } from "@/types/zvv";

interface FlipDotRowProps {
  departure: Departure;
  formatTime: (departure: Departure) => string;
}

export function FlipDotRow({ departure, formatTime }: FlipDotRowProps) {
  const lineNumber = departure.number || departure.name;
  const formattedTime = formatTime(departure);
  
  return (
    <div 
      className="flip-dot-row"
      role="listitem"
      aria-label={`Linie ${lineNumber} nach ${departure.to}, Abfahrt in ${formattedTime}`}
    >
      <div className="flip-dot-line">
        {lineNumber}
      </div>
      <div className="flip-dot-destination">
        {departure.to}
      </div>
      <div className="flip-dot-time">
        <span aria-label={`Abfahrt in ${formattedTime}`}>
          {formattedTime === "N/A" ? "N/A" : formattedTime.includes("'") ? formattedTime.replace("'", "′") : formattedTime}
        </span>
      </div>
    </div>
  );
}
