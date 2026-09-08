import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  X,
  Cloud,
  CloudCheck,
  LogOut,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { loginWithGoogle, logoutUser, syncChecklistItemsToCloud, fetchChecklistItemsFromCloud } from '../services/firebase';
import { ChecklistItem } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  checklistItems: ChecklistItem[];
  onUpdateItems: (items: ChecklistItem[]) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  checklistItems,
  onUpdateItems,
  onLogout,
}) => {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await loginWithGoogle();
      // Try to load any existing cloud checklist or backup current local
      setSyncStatus('Syncing checklist with Firebase Cloud...');
      const cloudItems = await fetchChecklistItemsFromCloud(user.uid);
      if (cloudItems && cloudItems.length > 0) {
        onUpdateItems(cloudItems);
        setSyncStatus(`Loaded ${cloudItems.length} items from cloud.`);
      } else if (checklistItems.length > 0) {
        await syncChecklistItemsToCloud(user.uid, checklistItems);
        setSyncStatus(`Backed up ${checklistItems.length} items to cloud.`);
      } else {
        setSyncStatus('Connected to Firebase Firestore.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSyncStatus(null);
      setErrorMessage(null);
      onClose();
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPush = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await syncChecklistItemsToCloud(currentUser.uid, checklistItems);
      setSyncStatus(`Successfully uploaded ${checklistItems.length} items to Firebase.`);
    } catch (err: any) {
      setErrorMessage('Failed to push to cloud: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleManualPull = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const cloudItems = await fetchChecklistItemsFromCloud(currentUser.uid);
      if (cloudItems && cloudItems.length > 0) {
        onUpdateItems(cloudItems);
        setSyncStatus(`Downloaded ${cloudItems.length} items from Firebase.`);
      } else {
        setSyncStatus('No saved items found in cloud.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to download from cloud: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[24px] max-w-sm w-full p-5 shadow-xl border border-[#EBEBE0] relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#7A7A6A] hover:text-[#2C2C24] hover:bg-[#F5F5F0] rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#2C2C24]">Cloud Sync & Account</h2>
            <p className="text-xs text-[#7A7A6A]">Firebase Firestore & Google Auth</p>
          </div>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 p-3 bg-[#F9F9F4] rounded-2xl border border-[#EBEBE0]">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-11 h-11 rounded-full object-cover border border-[#D5D5C8]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#5A5A40] text-white font-bold flex items-center justify-center text-sm">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#2C2C24] truncate">
                  {currentUser.displayName || 'Signed in User'}
                </p>
                <p className="text-xs text-[#7A7A6A] truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#5A5A40] font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#5A5A40]" />
                  <span>Verified Google Account</span>
                </div>
              </div>
            </div>

            {/* Cloud Status */}
            <div className="p-3 bg-white rounded-xl border border-[#EBEBE0] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#7A7A6A]">Active Database</span>
                <span className="font-mono text-[11px] text-[#2C2C24] font-medium">Firestore Enterprise</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7A7A6A]">Local Items</span>
                <span className="font-semibold text-[#2C2C24]">{checklistItems.length} items</span>
              </div>
            </div>

            {/* Sync Feedback */}
            {syncStatus && (
              <div className="p-2.5 bg-[#5A5A40]/10 rounded-xl text-xs text-[#5A5A40] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-[#C85A48]/10 rounded-xl text-xs text-[#C85A48] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualPush}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold text-[#2C2C24] bg-[#F5F5F0] hover:bg-[#EBEBE0] rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Upload to Cloud</span>
              </button>
              <button
                type="button"
                onClick={handleManualPull}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold text-[#2C2C24] bg-[#F5F5F0] hover:bg-[#EBEBE0] rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#5A5A40] ${loading ? 'animate-spin' : ''}`} />
                <span>Download Cloud</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full mt-2 py-2.5 px-3 text-xs font-semibold text-[#C85A48] hover:bg-[#C85A48]/10 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Google</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#5A5A40] leading-relaxed">
              Sign in with your Google account to automatically back up and synchronize your verified departure checklist, geofence, and inspection history across Android devices and browsers.
            </p>

            {errorMessage && (
              <div className="p-2.5 bg-[#C85A48]/10 rounded-xl text-xs text-[#C85A48] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#2C2C24] hover:bg-[#1A1A14] text-white rounded-2xl text-xs font-medium flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              )}
              <span>Continue with Google</span>
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-[#A0A090]">
                Protected by Firestore Zero-Trust Security Rules
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
