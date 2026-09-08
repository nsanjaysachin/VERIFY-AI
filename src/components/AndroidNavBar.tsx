import React from 'react';

interface AndroidNavBarProps {
  onBack?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({ onBack, onHome, canGoBack = true }) => {
  return (
    <div 
      id="android-nav-bar"
      className="w-full h-10 flex items-center justify-center select-none z-30 bg-transparent"
    >
      <div className="flex items-center justify-around w-48 py-1">
        {canGoBack && onBack ? (
          <button 
            type="button"
            onClick={onBack}
            className="p-2 text-[#7A7A6A] hover:text-[#2C2C24] transition-colors"
            title="Back"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
        ) : (
          <div className="w-8" />
        )}

        {/* Home gesture pill */}
        <button 
          type="button"
          onClick={onHome}
          className="w-24 h-1 bg-[#DCDCC8] rounded-full hover:bg-[#7A7A6A] transition-all active:scale-95"
          title="Home"
          aria-label="Home"
        />

        <div className="w-8" />
      </div>
    </div>
  );
};
