
import { Departure } from "@/types/zvv";

interface FlipDotRowProps {
  departure: Departure;
  formatTime: (departure: Departure) => string;
}

export function FlipDotRow({ departure, formatTime }: FlipDotRowProps) {
  const lineNumber = departure.number || departure.name;
  const formattedTime = formatTime(departure);
  
  // Enhanced delay parsing with strict type checking
  const delayValue = departure.stop.delay;
  const delayNumber = delayValue ? Number(delayValue) : 0;
  const hasDelay = delayNumber > 0;
  
  console.log('FlipDotRow delay processing:', {
    lineNumber,
    delayValue,
    delayNumber,
    hasDelay,
    delayType: typeof delayValue
  });
  
  return (
    <div 
      className="flip-dot-row"
      role="listitem"
      aria-label={`Linie ${lineNumber} nach ${departure.to}, Abfahrt in ${formattedTime}${hasDelay ? `, Verspätung ${delayNumber} Minuten` : ''}`}
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
          {/* Always render delay container for consistent spacing */}
          <div className="flip-dot-delay">
            {hasDelay && (
              <span>
                +{delayNumber}′
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
