import React from 'react';
import { ChevronRight, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DepartureEvent, ChecklistItem } from '../types';
import { getItemIcon } from './ChecklistScreen';
import { formatDistanceKm } from '../utils/distance';

interface DepartureNotificationBannerProps {
  event?: DepartureEvent | null;
  distanceMeters?: number;
  unverifiedItems?: ChecklistItem[];
  onOpenLeavingHome: () => void;
  onDismiss: () => void;
}

export const DepartureNotificationBanner: React.FC<DepartureNotificationBannerProps> = ({
  event,
  distanceMeters,
  unverifiedItems = [],
  onOpenLeavingHome,
  onDismiss,
}) => {
  const dist = event?.distanceMeters ?? distanceMeters ?? 150;
  
  // Extract unverified list from either prop or event
  const unverifiedNames = unverifiedItems.length > 0 
    ? unverifiedItems.map((i) => i.object)
    : event?.unverifiedItemsSample || [];

  const unverifiedCount = unverifiedItems.length > 0 
    ? unverifiedItems.length 
    : event?.unverifiedItemsCount ?? unverifiedNames.length;

  // Requirement 4: Contextual Departure Intelligence
  // 1. Check if critical safety item (Gas Stove / Stove) is unverified
  const hasUnverifiedStove = unverifiedNames.some((name) =>
    name.toLowerCase().includes('stove') || name.toLowerCase().includes('gas')
  );

  let title = 'You just left home';
  let message = '';
  let isDanger = false;

  if (unverifiedCount === 0) {
    title = 'All set. Your home is secure.';
    message = 'All safety, energy, and security checks verified.';
  } else if (hasUnverifiedStove) {
    isDanger = true;
    title = 'VERIFY Alert: Gas stove unverified';
    message = 'Your gas stove may still be ON. Tap to verify immediately.';
  } else if (unverifiedCount === 1) {
    title = `Check your ${unverifiedNames[0]}`;
    message = `You left home without verifying ${unverifiedNames[0]}. Tap to inspect.`;
  } else {
    title = `You left home with ${unverifiedCount} unverified items`;
    message = `${unverifiedNames.slice(0, 3).join(', ')}${unverifiedCount > 3 ? '...' : ''}. Tap to inspect.`;
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-top-6 duration-300">
      <div 
        onClick={onOpenLeavingHome}
        className={`rounded-[24px] p-4 shadow-2xl cursor-pointer transition-all backdrop-blur-md relative border ${
          isDanger
            ? 'bg-[#3A1E1E] text-[#FFF0F0] border-[#C85A48]/80'
            : unverifiedCount === 0
            ? 'bg-[#242E24] text-[#F0FFF0] border-[#5A7A50]/80'
            : 'bg-[#2C2C24] text-[#F5F5F0] border-[#5A5A40]/60 hover:bg-[#35352C]'
        }`}
      >
        {/* Android notification header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">🏠</span>
            <span className="text-[11px] font-semibold text-[#DCDCC8]">
              Departure Alert
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#DCDCC8]">
              {formatDistanceKm(dist)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#A0A090]">Just now</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 text-[#A0A090] hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification Main Body */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isDanger ? (
                <ShieldAlert className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
              ) : unverifiedCount === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
              )}
              <h4 className="text-sm font-serif font-bold truncate">
                {title}
              </h4>
            </div>

            <p className="text-xs text-[#DCDCC8] mt-1 leading-relaxed">
              {message}
            </p>

            {/* List of sample unverified items if present */}
            {unverifiedNames.length > 0 && unverifiedCount > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {unverifiedNames.slice(0, 3).map((itemName, idx) => {
                  const icon = getItemIcon(itemName, 'OTHER');
                  return (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium"
                    >
                      <span>{icon}</span>
                      <span>{itemName}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center pl-2 pt-1 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-md">
              <ChevronRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#DCDCC8] font-medium mt-1">Open</span>
          </div>
        </div>
      </div>
    </div>
  );
};
