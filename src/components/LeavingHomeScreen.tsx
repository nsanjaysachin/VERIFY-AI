import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  RotateCcw, 
  Sliders, 
  Radio, 
  ChevronRight,
  Sparkles, 
  RefreshCw, 
  Eye, 
  Info,
  Cpu,
  Flame,
  Lock,
  Zap,
  ArrowRight,
  ShieldAlert,
  Play,
  CheckCheck,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { ChecklistItem, VerificationResult, ItemCategory, LocationMonitorState, ItemImportance } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { getItemIcon } from './ChecklistScreen';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { formatDistanceKm } from '../utils/distance';
import { VoiceAssistantBar } from './VoiceAssistantBar';
import { OfficeKitModal } from './OfficeKitModal';
import { voiceAssistantService } from '../services/voiceAssistantService';

interface LeavingHomeScreenProps {
  items: ChecklistItem[];
  onUpdateItems: (items: ChecklistItem[]) => void;
  onGoToLocationSetup: () => void;
  onGoToChecklist?: () => void;
  onBack?: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

const IMPORTANCE_WEIGHT: Record<ItemImportance, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const LeavingHomeScreen: React.FC<LeavingHomeScreenProps> = ({
  items,
  onUpdateItems,
  onGoToLocationSetup,
  onGoToChecklist,
  onBack,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [locationState, setLocationState] = useState<LocationMonitorState>(() => locationService.getState());
  const [showOfficeKitModal, setShowOfficeKitModal] = useState<boolean>(false);
  const [sortByPriority, setSortByPriority] = useState<boolean>(true);

  useEffect(() => {
    const unsub = locationService.subscribe((state) => {
      setLocationState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Purely manual verification: one-tap check, no video/image proof needed
  const handleManualVerify = (itemId: string) => {
    const updated = items.map((item) => {
      if (item.id === itemId) {
        const isCurrentlyVerified = Boolean(item.lastVerified?.verified || item.isManuallyChecked);
        const willBeVerified = !isCurrentlyVerified;
        return {
          ...item,
          isManuallyChecked: willBeVerified,
          lastVerified: willBeVerified
            ? {
                object: item.object,
                detected_state: item.recommended_state,
                expected_state: item.recommended_state,
                verified: true,
                confidence: 1.0,
                engine: 'ON_DEVICE' as const,
                message: `Verified: ${item.recommended_state}`,
                timestamp: Date.now(),
              }
            : undefined,
        };
      }
      return item;
    });
    onUpdateItems(updated);
    storageService.saveChecklist(updated);

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch {}
  };

  const handleVerifyAllSafe = () => {
    const updated = items.map((item) => ({
      ...item,
      isManuallyChecked: true,
      lastVerified: {
        object: item.object,
        detected_state: item.recommended_state,
        expected_state: item.recommended_state,
        verified: true,
        confidence: 1.0,
        engine: 'ON_DEVICE' as const,
        message: `Verified: ${item.recommended_state}`,
        timestamp: Date.now(),
      },
    }));
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const handleResetVerifications = () => {
    const updated = items.map((item) => ({
      ...item,
      lastVerified: undefined,
      isManuallyChecked: false,
      beforeState: undefined,
      afterState: undefined,
    }));
    onUpdateItems(updated);
    storageService.saveChecklist(updated);
  };

  const handleOfficeKitSignal = (
    deviceName: string,
    affectedItemName: string,
    newState: string,
    verified: boolean
  ) => {
    const target = items.find((i) => i.object.toLowerCase().includes(affectedItemName.toLowerCase()));
    if (!target) return;

    const mockResult: VerificationResult = {
      object: target.object,
      detected_state: newState,
      expected_state: target.recommended_state,
      verified,
      confidence: 0.98,
      engine: 'ON_DEVICE',
      message: `Direct telemetry from ${deviceName}: Verified ${newState}.`,
      timestamp: Date.now(),
    };

    const updated = storageService.updateItemVerification(target.id, mockResult);
    onUpdateItems(updated);
  };

  const handleVoiceSelectItem = (itemName: string) => {
    const matched = items.find(
      (i) => i.object.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(i.object.toLowerCase())
    );
    if (matched) {
      handleManualVerify(matched.id);
      voiceAssistantService.speak(`${matched.object} verified safe and ${matched.recommended_state}.`);
    }
  };

  // Compute counts
  const verifiedCount = items.filter(
    (i) => (i.lastVerified && i.lastVerified.verified) || i.isManuallyChecked
  ).length;

  const failedCount = items.filter(
    (i) => i.lastVerified && !i.lastVerified.verified && !i.isManuallyChecked
  ).length;

  const criticalIssuesCount = items.filter(
    (i) => (!i.lastVerified?.verified && !i.isManuallyChecked) && (i.importance === 'CRITICAL' || i.importance === 'HIGH')
  ).length;

  const totalCount = items.length;
  const isAllSecured = totalCount > 0 && verifiedCount === totalCount;
  const unverifiedCount = totalCount - verifiedCount;

  // Filter and sort items
  const filtered = activeCategoryFilter === 'ALL'
    ? items
    : items.filter((i) => i.category === activeCategoryFilter);

  const displayItems = [...filtered].sort((a, b) => {
    if (sortByPriority) {
      const aVerified = (a.lastVerified && a.lastVerified.verified) || a.isManuallyChecked;
      const bVerified = (b.lastVerified && b.lastVerified.verified) || b.isManuallyChecked;
      // Show unverified items before verified items
      if (aVerified !== bVerified) return aVerified ? 1 : -1;

      // Then by importance
      const weightA = IMPORTANCE_WEIGHT[a.importance || 'LOW'];
      const weightB = IMPORTANCE_WEIGHT[b.importance || 'LOW'];
      return weightB - weightA;
    }
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F0] text-[#2C2C24] overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-[#EBEBE0] flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-[#7A7A6A] hover:text-[#2C2C24] hover:bg-[#F9F9F4] rounded-full transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-serif font-bold tracking-tight text-[#2C2C24]">
              Leaving Home
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  locationState.status === 'OUTSIDE'
                    ? 'bg-[#C85A48]/10 text-[#C85A48]'
                    : 'bg-[#5A5A40]/10 text-[#5A5A40]'
                }`}
              >
                {locationState.status === 'OUTSIDE' ? 'Outside Geofence' : 'At Home'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAuthModal && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="p-1 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full hover:bg-[#F9F9F4] transition-colors flex items-center gap-1 text-xs"
                title={currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : 'Sign in to sync with Cloud'}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-5 h-5 rounded-full object-cover border border-[#D5D5C8]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] text-[10px] font-bold">
                    {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : '☁️'}
                  </div>
                )}
              </button>

              {currentUser && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-[#7A7A6A] hover:text-[#C85A48] rounded-full hover:bg-[#F9F9F4] transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowOfficeKitModal(true)}
            className="p-2 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full hover:bg-[#F9F9F4] transition-colors"
            title="IoT & Smart Sensor Integration"
          >
            <Cpu className="w-4 h-4 text-[#5A5A40]" />
          </button>

          <button
            type="button"
            onClick={onGoToLocationSetup}
            className="p-2 text-[#7A7A6A] hover:text-[#2C2C24] rounded-full hover:bg-[#F9F9F4] transition-colors"
            title="Location Settings"
          >
            <MapPin className="w-4 h-4 text-[#5A5A40]" />
          </button>
        </div>
      </div>

      {/* Geofence Status Bar */}
      <div className="bg-[#2C2C24] text-[#F5F5F0] px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#DCDCC8]">
          <span className="text-xs">📍</span>
          <span>
            {locationState.status === 'OUTSIDE'
              ? `${formatDistanceKm(locationState.distanceMeters)} away from home`
              : locationState.status === 'INSIDE'
              ? `Within home boundary (${formatDistanceKm(locationState.distanceMeters)})`
              : 'Home boundary not configured'}
          </span>
        </div>

        <div className="text-[11px] text-[#A0B080] font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A0B080] animate-pulse" />
          <span>GPS Active</span>
        </div>
      </div>

      {/* Priority Warning Header */}
      {criticalIssuesCount > 0 && (
        <div className="bg-[#C85A48]/10 border-b border-[#C85A48]/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#C85A48] font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              {criticalIssuesCount} priority {criticalIssuesCount === 1 ? 'item' : 'items'} unverified
            </span>
          </div>
        </div>
      )}

      {/* Voice-First Assistant Bar (Requirement 3) */}
      <div className="px-4 pt-3 pb-1 max-w-lg mx-auto w-full">
        <VoiceAssistantBar
          checklistItems={items}
          onOpenVerificationForItem={handleVoiceSelectItem}
        />
      </div>

      {/* Category Filter Chips & Sort Controls */}
      <div className="px-4 py-2 bg-white border-b border-[#EBEBE0] flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {(['ALL', 'SAFETY', 'SECURITY', 'ENERGY'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all ${
                activeCategoryFilter === cat
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-white border border-[#DCDCC8] text-[#7A7A6A] hover:bg-[#F9F9F4]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSortByPriority(!sortByPriority)}
          className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${
            sortByPriority
              ? 'bg-[#5A5A40]/10 border-[#5A5A40]/30 text-[#5A5A40]'
              : 'bg-white border-gray-200 text-gray-400'
          }`}
          title="Toggle Smart Priority Sorting"
        >
          <Sparkles className="w-3 h-3" />
          <span>Priority</span>
        </button>
      </div>

      {/* Main Checklist Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {displayItems.map((item) => {
          const icon = getItemIcon(item.object, item.category);
          const isVerified = Boolean(item.lastVerified?.verified || item.isManuallyChecked);
          const isFailed = Boolean(item.lastVerified && !item.lastVerified.verified && !item.isManuallyChecked);

          // Check if Before/After transition occurred
          const hasTransition = item.beforeState && item.afterState && item.beforeState.state !== item.afterState.state;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-[24px] border transition-all ${
                isVerified
                  ? 'bg-white border-[#5A5A40]/40 shadow-xs'
                  : isFailed
                  ? 'bg-[#FFF9F9] border-[#C85A48]/40 shadow-xs'
                  : 'bg-white border-[#EBEBE0] shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Result State Indicator & Check Toggle */}
                <button
                  type="button"
                  onClick={() => handleManualVerify(item.id)}
                  className="mt-1 transition-transform active:scale-90"
                  title="Toggle check status"
                >
                  {isVerified ? (
                    <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-xs shadow-xs font-bold">
                      ✓
                    </div>
                  ) : isFailed ? (
                    <div className="w-6 h-6 rounded-full bg-[#C85A48] text-white flex items-center justify-center text-xs shadow-xs font-bold">
                      ✕
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white border border-[#DCDCC8] hover:border-[#5A5A40] transition-colors" />
                  )}
                </button>

                {/* Item Details */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleManualVerify(item.id)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-bold tracking-tight text-[#2C2C24]">
                      {item.object}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[#7A7A6A] border border-[#EBEBE0]">
                      {item.room}
                    </span>

                    {/* Importance Badge */}
                    {item.importance && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.importance === 'CRITICAL'
                            ? 'bg-[#C85A48]/15 text-[#C85A48] border border-[#C85A48]/30'
                            : item.importance === 'HIGH'
                            ? 'bg-[#D4A373]/20 text-[#b45309] border border-[#D4A373]/40'
                            : 'bg-[#5A5A40]/10 text-[#5A5A40]'
                        }`}
                      >
                        {item.importance}
                      </span>
                    )}
                  </div>

                  {/* Context-Aware Reason */}
                  {item.reason && (
                    <p className="text-[11px] text-[#7A7A6A] mt-1 line-clamp-2">
                      {item.reason}
                    </p>
                  )}

                  {/* Expected State & Dynamic Result Label */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] font-medium text-[#7A7A6A]">
                      Must be: <strong className="font-mono font-bold text-[#5A5A40] uppercase">{item.recommended_state}</strong>
                    </span>

                    {/* Result state pill */}
                    {isVerified && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Safe</span>
                      </span>
                    )}
                    {isFailed && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C85A48]/10 text-[#C85A48] border border-[#C85A48]/20 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Needs Attention</span>
                      </span>
                    )}
                    {!isVerified && !isFailed && (
                      <span className="text-[10px] text-[#7A7A6A] flex items-center gap-1">
                        ⚪ Tap to verify safe
                      </span>
                    )}
                  </div>

                  {/* Before → After Transition Card if resolved */}
                  {hasTransition && (
                    <div className="mt-2 p-2 rounded-xl bg-[#F5F5F0] border border-[#EBEBE0] flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[#C85A48]">Was: {item.beforeState?.state}</span>
                      <ArrowRight className="w-3 h-3 text-[#7A7A6A]" />
                      <span className="text-[#5A5A40] font-bold">Now: {item.afterState?.state}</span>
                    </div>
                  )}
                </div>

                {/* Direct Manual Verify Action Button */}
                <button
                  type="button"
                  onClick={() => handleManualVerify(item.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                    isVerified
                      ? 'bg-[#5A5A40]/10 border border-[#5A5A40]/30 hover:bg-[#5A5A40]/20 text-[#5A5A40]'
                      : 'bg-[#5A5A40] hover:bg-[#4C4C36] text-white'
                  }`}
                  title={isVerified ? 'Tap to unverify' : 'Tap to verify manually'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isVerified ? 'Verified' : 'Verify Safe'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {displayItems.length === 0 && (
          <div className="p-8 text-center text-[#7A7A6A] bg-white rounded-[24px] border border-[#EBEBE0]">
            <p className="text-sm font-semibold mb-1 text-[#2C2C24]">No checklist items.</p>
            <p className="text-xs text-[#7A7A6A] mb-3">
              Scan your home or set up safety items in your checklist.
            </p>
            {onGoToChecklist && (
              <button
                type="button"
                onClick={onGoToChecklist}
                className="text-xs text-[#5A5A40] underline font-semibold"
              >
                Go to Checklist
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Bottom Bar */}
      <div className="p-4 bg-white border-t border-[#EBEBE0] z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-[#7A7A6A]">
            <span className="text-sm font-semibold text-[#2C2C24]">
              {verifiedCount} of {totalCount} verified safe
            </span>
          </div>

          <div className="flex items-center gap-2">
            {unverifiedCount > 0 && (
              <button
                type="button"
                onClick={handleVerifyAllSafe}
                className="text-[11px] font-bold text-white bg-[#5A5A40] hover:bg-[#4C4C36] px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs transition-colors"
                title="Mark all items verified safe"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Verify All Safe</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetVerifications}
              className="text-[11px] font-medium text-[#7A7A6A] hover:text-[#2C2C24] flex items-center gap-1 px-2 py-1 rounded-full border border-[#DCDCC8]"
              title="Reset verification statuses"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#EBEBE0] rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#5A5A40] transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        {/* Outcome Badge Banner */}
        <div
          className={`py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold ${
            isAllSecured
              ? 'bg-[#5A5A40] text-white'
              : 'bg-[#C85A48]/10 text-[#C85A48]'
          }`}
        >
          {isAllSecured ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Safe to leave • All items checked</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-[#C85A48]" />
              <span>{unverifiedCount} {unverifiedCount === 1 ? 'item' : 'items'} unverified • Tap to check before leaving</span>
            </>
          )}
        </div>
      </div>

      {/* iQOO Office Kit Modal */}
      {showOfficeKitModal && (
        <OfficeKitModal
          onClose={() => setShowOfficeKitModal(false)}
          onApplySignalToChecklist={handleOfficeKitSignal}
          checklistItems={items}
        />
      )}
    </div>
  );
};
