import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ScrollButtonsProps {
  /** Show threshold - buttons appear after scrolling this many pixels */
  showAfter?: number;
  /** Position from right edge */
  rightOffset?: string;
  /** Position from bottom edge */
  bottomOffset?: string;
}

export const ScrollButtons: React.FC<ScrollButtonsProps> = ({
  showAfter = 300,
  rightOffset = '1.5rem',
  bottomOffset = '1.5rem',
}) => {
  const [showTopButton, setShowTopButton] = useState(false);
  const [showBottomButton, setShowBottomButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show "back to top" after scrolling down past threshold
      setShowTopButton(scrollTop > showAfter);
      
      // Show "scroll to bottom" when not near the bottom
      // Hide when within 100px of bottom
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      setShowBottomButton(distanceFromBottom > 100 && scrollTop < showAfter);
    };

    // Check initial state
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfter]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className="fixed z-50 flex flex-col gap-2"
      style={{
        right: rightOffset,
        bottom: bottomOffset,
      }}
    >
      {/* Scroll to Bottom Button */}
      <button
        onClick={scrollToBottom}
        className={`
          p-3 rounded-full bg-white border-2 border-purple-200 shadow-lg
          text-purple-600 hover:text-purple-800 hover:border-purple-400 hover:shadow-xl
          transition-all duration-300 ease-out
          ${showBottomButton 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        <ArrowDown className="w-5 h-5" />
      </button>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`
          p-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/25
          text-white hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105
          transition-all duration-300 ease-out
          ${showTopButton 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        aria-label="Back to top"
        title="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};
