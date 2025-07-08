
import { useState, useEffect, useCallback, useRef } from 'react';

interface DynamicEntriesOptions {
  isFullscreen: boolean;
  isLedTheme: boolean;
  fontSize: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useDynamicEntries({
  isFullscreen,
  isLedTheme,
  fontSize,
  containerRef
}: DynamicEntriesOptions) {
  const [maxEntries, setMaxEntries] = useState(isLedTheme ? 8 : 10);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateMaxEntries = useCallback(() => {
    if (!isFullscreen) {
      setMaxEntries(isLedTheme ? 8 : 10);
      return;
    }

    // Use dynamic viewport height when available, fallback to window.innerHeight
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const fontSizeFactor = fontSize / 100;
    
    // Reduced buffer for more entries
    const isMobile = window.innerWidth < 768;
    const buffer = isMobile ? 20 : 15;
    
    let headerHeight: number;
    let rowHeight: number;
    let additionalSpace = 0;

    if (isLedTheme) {
      // LED theme measurements - more precise calculations
      headerHeight = Math.ceil(50 * fontSizeFactor); // flip-dot-header
      rowHeight = Math.ceil(40 * fontSizeFactor); // flip-dot-row min-height
      additionalSpace = Math.ceil(15 * fontSizeFactor); // borders and padding
    } else {
      // Standard theme measurements
      headerHeight = Math.ceil(100 * fontSizeFactor); // zvv-header
      const tableHeaderHeight = Math.ceil(45 * fontSizeFactor);
      rowHeight = Math.ceil(60 * fontSizeFactor); // departure-row
      additionalSpace = headerHeight + tableHeaderHeight + Math.ceil(10 * fontSizeFactor);
      headerHeight = 0; // Already included in additionalSpace
    }

    // Calculate available height for entries
    const availableHeight = viewportHeight - additionalSpace - buffer;
    const calculatedEntries = Math.floor(availableHeight / rowHeight);

    // Set reasonable bounds - increased maximums
    const minEntries = isLedTheme ? 6 : 8;
    const maxEntriesLimit = isLedTheme ? 50 : 60;
    
    const finalEntries = Math.max(minEntries, Math.min(calculatedEntries, maxEntriesLimit));
    
    console.log('Dynamic entries calculation:', {
      viewportHeight,
      fontSizeFactor,
      fontSize,
      headerHeight,
      rowHeight,
      additionalSpace,
      buffer,
      availableHeight,
      calculatedEntries,
      finalEntries,
      theme: isLedTheme ? 'LED' : 'Standard',
      isMobile
    });

    setMaxEntries(finalEntries);
  }, [isFullscreen, isLedTheme, fontSize]);

  const debouncedCalculate = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(calculateMaxEntries, 50);
  }, [calculateMaxEntries]);

  useEffect(() => {
    calculateMaxEntries();
  }, [calculateMaxEntries]);

  useEffect(() => {
    if (!isFullscreen) return;

    // Listen to multiple resize events for better mobile support
    window.addEventListener('resize', debouncedCalculate);
    window.addEventListener('orientationchange', debouncedCalculate);
    
    // Listen to visual viewport changes (mobile keyboards, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedCalculate);
    }

    // Recalculate after a short delay to ensure DOM is settled
    const timeoutId = setTimeout(calculateMaxEntries, 100);

    return () => {
      window.removeEventListener('resize', debouncedCalculate);
      window.removeEventListener('orientationchange', debouncedCalculate);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', debouncedCalculate);
      }
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      clearTimeout(timeoutId);
    };
  }, [isFullscreen, debouncedCalculate, calculateMaxEntries]);

  return maxEntries;
}
