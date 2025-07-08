
import { motion } from "framer-motion";
import { Departure } from "@/types/zvv";

interface FlipDotRowProps {
  departure: Departure;
  formatTime: (departure: Departure) => string;
  prefersReducedMotion?: boolean;
}

function getDisplayLineNumber(departure: Departure): string {
  const category = departure.category;
  const number = departure.number;
  const name = departure.name;
  
  // If we have both category and number, combine them intelligently
  if (category && number) {
    // For trains, combine category + number (e.g., "S12", "IR75", "IC8")
    if (['S', 'IR', 'IC', 'ICE', 'R', 'RE'].includes(category.toUpperCase())) {
      return `${category.toUpperCase()}${number}`;
    }
    // For other transport types, just use the number
    return number;
  }
  
  // If we only have category, use it
  if (category) {
    return category.toUpperCase();
  }
  
  // If we only have number, use it
  if (number) {
    return number;
  }
  
  // Fallback to name, but truncate if too long
  if (name && name.length > 6) {
    return name.substring(0, 4) + '..';
  }
  
  return name || '?';
}

export function FlipDotRow({ departure, formatTime, prefersReducedMotion = false }: FlipDotRowProps) {
  const lineNumber = getDisplayLineNumber(departure);
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
    delayType: typeof delayValue,
    category: departure.category,
    number: departure.number,
    displayLineNumber: lineNumber
  });

  // LED-specific animation variants with retro feel
  const ledSlideVariants = {
    enter: {
      y: 40,
      opacity: 0
    },
    center: {
      y: 0,
      opacity: 1
    },
    exit: {
      y: -20,
      opacity: 0
    }
  };
  
  return (
    <motion.div 
      className="flip-dot-row"
      variants={prefersReducedMotion ? {} : ledSlideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      layout={!prefersReducedMotion}
      transition={{
        duration: 0.4,
        ease: "easeOut"
      }}
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
            {hasDelay ? (
              <span>
                +{delayNumber}′
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
