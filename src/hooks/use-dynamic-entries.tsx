
import { useState, useEffect, useCallback, useRef } from 'react';

interface DynamicEntriesOptions {
  isFullscreen: boolean;
  isLedTheme: boolean;
  containerRef?: React.RefObject<HTMLElement>;
  stationCount?: number;
}

export function useDynamicEntries({
  isFullscreen,
  isLedTheme,
  containerRef,
  stationCount = 1
}: DynamicEntriesOptions) {
  const [maxEntries, setMaxEntries] = useState(isLedTheme ? 8 : 10);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateMaxEntries = useCallback(() => {
    if (!isFullscreen) {
      const baseEntries = isLedTheme ? 8 : 10;
      
      // Adjust entries based on station count for grid layouts
      let adjustedEntries = baseEntries;
      if (stationCount > 1 && window.innerWidth >= 1024) {
        // Reduce entries when stations are side-by-side on larger screens
        adjustedEntries = Math.max(6, Math.floor(baseEntries * 0.8));
      }
      
      // For LED theme, subtract 1 to show the end of the list
      setMaxEntries(isLedTheme ? adjustedEntries - 1 : adjustedEntries);
      return;
    }

    // Use dynamic viewport height when available, fallback to window.innerHeight
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    
    // Reduced buffer for more entries
    const isMobile = window.innerWidth < 768;
    const buffer = isMobile ? 20 : 15;
    
    let headerHeight: number;
    let rowHeight: number;
    let additionalSpace = 0;

    if (isLedTheme) {
      // LED theme measurements - fixed values
      headerHeight = 50; // flip-dot-header
      rowHeight = 40; // flip-dot-row min-height
      additionalSpace = 15; // borders and padding
    } else {
      // Standard theme measurements - fixed values
      headerHeight = 100; // zvv-header
      const tableHeaderHeight = 45;
      rowHeight = 60; // departure-row
      additionalSpace = headerHeight + tableHeaderHeight + 10;
      headerHeight = 0; // Already included in additionalSpace
    }

    // Adjust available height for multiple stations in grid layout
    let effectiveHeight = viewportHeight;
    if (stationCount > 1 && window.innerWidth >= 1024) {
      // Account for grid layout - stations share vertical space
      const isGridLayout = (stationCount === 2 && window.innerWidth >= 1024) || 
                          (stationCount > 2 && window.innerWidth >= 1280);
      if (isGridLayout) {
        // Don't reduce height as much since stations are side-by-side
        effectiveHeight = viewportHeight;
      }
    }

    // Calculate available height for entries
    const availableHeight = effectiveHeight - additionalSpace - buffer;
    const calculatedEntries = Math.floor(availableHeight / rowHeight);

    // Set reasonable bounds - increased maximums
    const minEntries = isLedTheme ? 6 : 8;
    const maxEntriesLimit = isLedTheme ? 50 : 60;
    
    // Adjust based on station count and screen size
    let adjustmentFactor = 1;
    if (stationCount > 1 && window.innerWidth >= 1024) {
      // Slightly reduce entries per station when multiple stations are visible
      adjustmentFactor = stationCount === 2 ? 0.9 : 0.8;
    }
    
    let finalEntries = Math.max(minEntries, Math.min(Math.floor(calculatedEntries * adjustmentFactor), maxEntriesLimit));
    
    // For LED theme, subtract 1 to leave space at the bottom to show list end
    if (isLedTheme) {
      finalEntries = Math.max(minEntries - 1, finalEntries - 1);
    }
    
    console.log('Dynamic entries calculation:', {
      viewportHeight,
      effectiveHeight,
      headerHeight,
      rowHeight,
      additionalSpace,
      buffer,
      availableHeight,
      calculatedEntries,
      finalEntries,
      stationCount,
      adjustmentFactor,
      theme: isLedTheme ? 'LED' : 'Standard',
      isMobile,
      ledAdjustment: isLedTheme ? 'Reduced by 1 for list end visibility' : 'No adjustment'
    });

    setMaxEntries(finalEntries);
  }, [isFullscreen, isLedTheme, stationCount]);

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
