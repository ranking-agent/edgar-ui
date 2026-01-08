import { useEffect, useRef } from 'react';

/**
 * Hook to auto-scroll to the top of a component when dependencies change
 * @param dependencies - Array of values that trigger scroll when changed
 * @param options - Scroll behavior options
 */
export const useAutoScroll = (
  dependencies: any[],
  options: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition } = {}
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { behavior = 'smooth', block = 'start' } = options;

  useEffect(() => {
    // Scroll the container element into view
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior, block });
    }
    
    // Also scroll window to top for good measure
    window.scrollTo({ top: 0, behavior });
  }, dependencies);

  return containerRef;
};

/**
 * Utility function to scroll to top of page
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({ top: 0, behavior });
};

/**
 * Utility function to scroll an element into view
 */
export const scrollIntoView = (
  element: HTMLElement | null,
  options: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition } = {}
) => {
  if (element) {
    element.scrollIntoView({ 
      behavior: options.behavior || 'smooth', 
      block: options.block || 'start' 
    });
  }
};
