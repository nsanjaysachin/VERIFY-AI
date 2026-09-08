import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Camera, 
  CheckSquare, 
  ArrowRight, 
  Play, 
  MapPin, 
  Flame, 
  Lock, 
  Zap, 
  Mic, 
  Bell,
  ChevronRight,
  Video,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { LocationMonitorState } from '../types';
import { formatDistanceKm } from '../utils/distance';

interface WelcomeScreenProps {
  onStartScan: () => void;
  onResumeChecklist?: () => void;
  onGoToLocationSetup?: () => void;
  onGoToLeavingHome?: () => void;
  onVerifyDefaultChecklist?: () => void;
  savedItemCount?: number;
  currentUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onGoToLogin?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartScan,
  onResumeChecklist,
  onGoToLocationSetup,
  onGoToLeavingHome,
  onVerifyDefaultChecklist,
  savedItemCount = 0,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onGoToLogin,
}) => {
  const [locState, setLocState] = useState<LocationMonitorState>(() => locationService.getState());
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  });

  useEffect(() => {
    const unsub = locationService.subscribe((st) => setLocState(st));
    return unsub;
  }, []);

  const handleStartLeavingHome = () => {
    if (onGoToLeavingHome) {
      onGoToLeavingHome();
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await locationService.requestNotificationPermission();
    setNotifPerm(perm);
  };

  const isDeparted = locState.status === 'OUTSIDE';
  const isFirstTime = savedItemCount === 0;

  return (
    <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 overflow-y-auto max-w-md mx-auto w-full bg-[#F5F5F0] text-[#2C2C24]">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-[#2C2C24]">VERIFY</span>
              <span className="ml-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] uppercase">
                Physical AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Google Auth / Cloud Sync Button */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#F9F9F4] border border-[#DCDCC8] shadow-2xs text-[11px] font-medium transition-colors"
                  title={`Signed in as ${currentUser.displayName || currentUser.email}`}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Profile"
                      className="w-4 h-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#5A5A40]" />
                  )}
                  <span className="text-[#2C2C24] max-w-[80px] truncate">
                    {currentUser.displayName?.split(' ')[0] || 'Account'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-full bg-white hover:bg-[#F9F9F4] text-[#7A7A6A] hover:text-[#C85A48] border border-[#DCDCC8] shadow-2xs transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoToLogin || onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#F9F9F4] border border-[#DCDCC8] shadow-2xs text-[11px] font-medium transition-colors"
                title="Sign in with Google"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-[#5A5A40]">Log In</span>
              </button>
            )}

            {/* Quick notification permission pill */}
            {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="text-[11px] font-semibold text-[#5A5A40] hover:text-[#2C2C24] bg-white hover:bg-[#F9F9F4] px-2.5 py-1 rounded-full border border-[#DCDCC8] shadow-2xs transition-colors flex items-center gap-1.5"
                title="Enable automatic exit notifications"
              >
                <Bell className="w-3 h-3 text-[#C85A48]" />
                <span>Alerts</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2C2C24] leading-tight font-bold">
            Know your home is secure before you leave.
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#7A7A6A] leading-relaxed">
            Auto-detects when you leave home and prompts you to verify stoves, doors, ACs, and windows manually.
          </p>
        </div>

        {/* Live Automatic Exit Detection Card */}
        {(() => {
          const homeLocation = storageService.getHomeLocation();
          const hasHome = Boolean(homeLocation);

          return (
            <div className="p-3.5 rounded-2xl bg-white border border-[#EBEBE0] shadow-2xs mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      !hasHome ? 'bg-[#7A7A6A]' : isDeparted ? 'bg-[#C85A48]' : 'bg-[#5A5A40]'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      !hasHome ? 'bg-[#7A7A6A]' : isDeparted ? 'bg-[#C85A48]' : 'bg-[#5A5A40]'
                    }`} />
                  </span>
                  <span className="text-xs font-bold text-[#2C2C24]">
                    Auto Exit Detection
                  </span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !hasHome
                    ? 'bg-[#7A7A6A]/15 text-[#7A7A6A]'
                    : isDeparted 
                    ? 'bg-[#C85A48]/15 text-[#C85A48]' 
                    : 'bg-[#5A5A40]/15 text-[#5A5A40]'
                }`}>
                  {!hasHome ? 'Location Not Set' : isDeparted ? 'Outside Home' : 'Inside Home'}
                </span>
              </div>

              <div className="text-[11px] text-[#7A7A6A] flex items-center justify-between">
                <div>
                  {!hasHome ? (
                    <span>Set your home location to enable departure alerts.</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Live Distance:</span>
                      <span className="font-mono font-bold text-[#2C2C24] bg-[#5A5A40]/10 px-1.5 py-0.5 rounded text-[11px]">
                        {formatDistanceKm(locState.distanceMeters)}
                      </span>
                      <span>({isDeparted ? 'outside perimeter' : 'at home'})</span>
                    </div>
                  )}
                </div>
                {onGoToLocationSetup && (
                  <button
                    type="button"
                    onClick={onGoToLocationSetup}
                    className="text-[#5A5A40] font-semibold hover:underline text-[11px] ml-2 shrink-0"
                  >
                    {!hasHome ? 'Set Home →' : 'Radar & Distance →'}
                  </button>
                )}
              </div>

              {/* If user is currently departed, provide direct safety action */}
              {isDeparted && (
                <div className="pt-2 border-t border-[#EBEBE0] flex items-center justify-between gap-2 animate-in fade-in">
                  <span className="text-[11px] text-[#C85A48] font-medium">
                    Boundary exit detected.
                  </span>
                  {onGoToLeavingHome && (
                    <button
                      type="button"
                      onClick={onGoToLeavingHome}
                      className="py-1.5 px-3 rounded-xl bg-[#C85A48] hover:bg-[#B34D3C] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      Review Checklist →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* First-Time Setup Card */}
        {isFirstTime ? (
          <div className="p-4 rounded-3xl bg-white border border-[#DCDCC8] shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h2 className="text-sm font-bold text-[#2C2C24]">
                Your Checklist is Empty
              </h2>
            </div>
            <p className="text-xs text-[#7A7A6A] mb-3 leading-relaxed">
              You haven&apos;t added any items yet. You can scan your home with your camera or add items manually:
            </p>

            <div className="space-y-2.5">
              {/* Option A: Record Video */}
              <button
                type="button"
                onClick={onStartScan}
                className="w-full p-3 rounded-2xl border border-[#DCDCC8] hover:border-[#5A5A40] bg-[#F9F9F4] hover:bg-white text-left transition-all active:scale-[0.99] flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#C85A48]/10 text-[#C85A48] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C2C24]">Scan Rooms with Camera</span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#C85A48]/15 text-[#C85A48]">
                      Camera AI
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A7A6A] mt-0.5">
                    Walk through your rooms with your camera to detect stoves, doors, and windows.
                  </p>
                </div>
              </button>

              {/* Option B: Custom Items Manually */}
              <button
                type="button"
                onClick={onResumeChecklist || handleStartLeavingHome}
                className="w-full p-3 rounded-2xl border border-[#5A5A40]/30 hover:border-[#5A5A40] bg-[#5A5A40]/5 hover:bg-[#5A5A40]/10 text-left transition-all active:scale-[0.99] flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#5A5A40]/15 text-[#5A5A40] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C2C24]">Add Items Manually</span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#5A5A40]/15 text-[#5A5A40]">
                      Custom
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A7A6A] mt-0.5">
                    Start with an empty checklist and add your own specific appliances or perimeter locks.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Returning Routine Card */
          <div className="p-4 rounded-3xl bg-white border border-[#EBEBE0] shadow-sm mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#2C2C24] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
                Leaving Home Checklist
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40]">
                Manual Verification
              </span>
            </div>
            <p className="text-xs text-[#7A7A6A] mb-3">
              Tap each item to verify before leaving. No video or image proof needed!
            </p>

            <button
              type="button"
              onClick={handleStartLeavingHome}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#5A5A40] hover:bg-[#4C4C36] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Verify Items Before Leaving</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* 4 Key Pillars Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-white border border-[#EBEBE0] shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-[#C85A48]/10 text-[#C85A48] flex items-center justify-center mb-1.5">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#2C2C24]">Safety &amp; Fire</h3>
            <p className="text-[10px] text-[#7A7A6A] mt-0.5">Gas stove, burners, ovens, and heaters</p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EBEBE0] shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-1.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#2C2C24]">Perimeter</h3>
            <p className="text-[10px] text-[#7A7A6A] mt-0.5">Main entrance, balcony locks, and windows</p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EBEBE0] shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-[#D4A373]/20 text-[#b45309] flex items-center justify-center mb-1.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#2C2C24]">Energy Drain</h3>
            <p className="text-[10px] text-[#7A7A6A] mt-0.5">Air conditioning, irons, and power strips</p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EBEBE0] shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-[#3b82f6]/10 text-[#2563eb] flex items-center justify-center mb-1.5">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#2C2C24]">Voice Assistant</h3>
            <p className="text-[10px] text-[#7A7A6A] mt-0.5">&ldquo;Check my home&rdquo; &amp; &ldquo;Check the AC&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Action Navigation / Links */}
      <div className="pt-2 pb-2 space-y-2">
        {savedItemCount > 0 ? (
          <>
            <button
              type="button"
              onClick={onStartScan}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-[#F9F9F4] text-[#2C2C24] font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-[#DCDCC8] shadow-2xs"
            >
              <Video className="w-4 h-4 text-[#C85A48]" />
              <span>Rescan House Video</span>
            </button>

            {onResumeChecklist && (
              <button
                type="button"
                onClick={onResumeChecklist}
                className="w-full py-1 text-center text-xs text-[#7A7A6A] hover:text-[#2C2C24] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>View Checklist ({savedItemCount} items)</span>
              </button>
            )}
          </>
        ) : (
          <p className="text-center text-[11px] text-[#7A7A6A]">
            💡 Routine verifications require no video or photo proof.
          </p>
        )}
      </div>
    </div>
  );
};
