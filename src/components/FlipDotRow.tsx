
import { Departure } from "@/types/zvv";

interface FlipDotRowProps {
  departure: Departure;
  formatTime: (departure: Departure) => string;
}

export function FlipDotRow({ departure, formatTime }: FlipDotRowProps) {
  const lineNumber = departure.number || departure.name;
  const formattedTime = formatTime(departure);
  const hasDelay = departure.stop.delay && departure.stop.delay > 0;
  
  return (
    <div 
      className="flip-dot-row"
      role="listitem"
      aria-label={`Linie ${lineNumber} nach ${departure.to}, Abfahrt in ${formattedTime}${hasDelay ? `, Verspätung ${departure.stop.delay} Minuten` : ''}`}
    >
      <div className="flip-dot-line">
        {lineNumber}
      </div>
      <div className="flip-dot-destination">
        {departure.to}
      </div>
      <div className="flip-dot-time">
        <div className="flex flex-col items-center justify-center">
          <span aria-label={`Abfahrt in ${formattedTime}`}>
            {formattedTime === "N/A" ? "N/A" : formattedTime.includes("'") ? formattedTime.replace("'", "′") : formattedTime}
          </span>
          {hasDelay && (
            <span className="flip-dot-delay">
              +{departure.stop.delay}′
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
