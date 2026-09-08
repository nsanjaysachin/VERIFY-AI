import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppScreen, 
  HomeScanCapture, 
  DetectedHomeItem, 
  ChecklistItem,
  LocationMonitorState,
  DepartureEvent
} from './types';
import { storageService } from './services/storageService';
import { locationService } from './services/locationService';
import {
  subscribeToAuth,
  testFirestoreConnection,
  ensureUserDoc,
  syncChecklistItemsToCloud,
  fetchChecklistItemsFromCloud,
  saveDepartureEventToCloud,
  fetchHomeLocationFromCloud,
  saveHomeLocationToCloud,
  logoutUser
} from './services/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidNavBar } from './components/AndroidNavBar';
import { LoginScreen } from './components/LoginScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HomeScanScreen } from './components/HomeScanScreen';
import { AnalysisLoadingScreen } from './components/AnalysisLoadingScreen';
import { ReviewHomeScreen } from './components/ReviewHomeScreen';
import { ChecklistScreen } from './components/ChecklistScreen';
import { HomeLocationScreen } from './components/HomeLocationScreen';
import { LeavingHomeScreen } from './components/LeavingHomeScreen';
import { DepartureNotificationBanner } from './components/DepartureNotificationBanner';
import { AuthModal } from './components/AuthModal';
import { Smartphone, RotateCcw } from 'lucide-react';

const getInitialUser = (): FirebaseUser | null => {
  try {
    if (localStorage.getItem('verify_guest_session') === 'true') {
      return {
        uid: 'guest-local-user',
        displayName: 'Guest User',
        email: null,
        isAnonymous: true,
      } as FirebaseUser;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export default function App() {
  const initialUser = getInitialUser();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(initialUser);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => (initialUser ? 'WELCOME' : 'LOGIN'));
  const [captures, setCaptures] = useState<HomeScanCapture[]>([]);
  const [detectedItems, setDetectedItems] = useState<DetectedHomeItem[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(() => storageService.getChecklist());
  const [locationState, setLocationState] = useState<LocationMonitorState>(() => locationService.getState());
  const [latestDepartureEvent, setLatestDepartureEvent] = useState<DepartureEvent | null>(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const currentUserRef = useRef<FirebaseUser | null>(initialUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Sync wrapper that updates state, local storage, and cloud if authenticated
  const handleUpdateChecklistItems = useCallback((newItems: ChecklistItem[]) => {
    setChecklistItems(newItems);
    storageService.saveChecklist(newItems);
    const activeUser = currentUserRef.current;
    if (activeUser && !activeUser.isAnonymous) {
      syncChecklistItemsToCloud(activeUser.uid, newItems).catch((err) => {
        console.warn('Cloud auto-sync notice:', err);
      });
    }
  }, []);

  // Initialize location intelligence & Firebase Auth sync (once on mount)
  useEffect(() => {
    // Initial Firestore connection test
    testFirestoreConnection().catch((err) => console.warn('Firestore boot check:', err));

    // Subscribe to Firebase Auth
    const unsubAuth = subscribeToAuth(async (user) => {
      if (user) {
        setCurrentUser(user);
        currentUserRef.current = user;
        setCurrentScreen((prev) => (prev === 'LOGIN' ? 'WELCOME' : prev));
        try {
          // Await valid ID token before firing any Firestore operations
          await user.getIdToken();
          await ensureUserDoc(user);
          // Fetch existing cloud items
          const cloudItems = await fetchChecklistItemsFromCloud(user.uid);
          if (cloudItems && cloudItems.length > 0) {
            setChecklistItems(cloudItems);
            storageService.saveChecklist(cloudItems);
          }

          // Fetch cloud home location if present
          const cloudLoc = await fetchHomeLocationFromCloud(user.uid);
          if (cloudLoc) {
            storageService.saveHomeLocation(cloudLoc);
          }
        } catch (e) {
          console.warn('Could not sync user cloud data on login:', e);
        }
      } else {
        const isGuest = localStorage.getItem('verify_guest_session') === 'true';
        if (!isGuest) {
          setCurrentUser(null);
          currentUserRef.current = null;
          setCurrentScreen('LOGIN');
        }
      }
    });

    // Initialize location service and start automatic live watching
    locationService.init();
    locationService.startLiveWatching();

    // Subscribe to state updates
    const unsubState = locationService.subscribe((state) => {
      setLocationState(state);
    });

    // Subscribe to departure exit events (auto-detection triggers this)
    const unsubDeparture = locationService.onDepartureEvent((event) => {
      setLatestDepartureEvent(event);
      setShowNotificationBanner(true);
      const activeUser = currentUserRef.current;
      if (activeUser && !activeUser.isAnonymous) {
        saveDepartureEventToCloud(activeUser.uid, event).catch(console.warn);
      }
    });

    return () => {
      unsubAuth();
      unsubState();
      unsubDeparture();
      locationService.stopLiveWatching();
    };
  }, []);

  // Handlers for step transitions
  const handleStartScan = () => {
    setCurrentScreen('HOME_SCAN');
  };

  const handleResumeChecklist = () => {
    setCurrentScreen('CHECKLIST');
  };

  const handleGoToLocationSetup = () => {
    setCurrentScreen('HOME_LOCATION');
  };

  const handleGoToLeavingHome = () => {
    setCurrentScreen('LEAVING_HOME');
    setShowNotificationBanner(false);
  };

  const handleVerifyDefaultChecklist = () => {
    const defaultItems = storageService.initializeStandardHouseholdChecklist();
    setChecklistItems(defaultItems);
    storageService.setOnboardingCompleted(true);
    setCurrentScreen('CHECKLIST');
  };

  const handleStartAnalysis = (capturedPhotos: HomeScanCapture[]) => {
    setCaptures(capturedPhotos);
    storageService.saveCaptures(capturedPhotos);
    setCurrentScreen('ANALYZING');
  };

  const handleAnalysisComplete = (items: DetectedHomeItem[]) => {
    setDetectedItems(items);
    setCurrentScreen('REVIEW');
  };

  const handleAnalysisError = (_error: string) => {
    // Return to scan screen on error so user can adjust photos
    setCurrentScreen('HOME_SCAN');
  };

  const handleConfirmReview = (confirmedItems: DetectedHomeItem[]) => {
    const newChecklist: ChecklistItem[] = confirmedItems.map(item => ({
      ...item,
      isManuallyChecked: false,
    }));
    setChecklistItems(newChecklist);
    storageService.saveChecklist(newChecklist);
    storageService.setOnboardingCompleted(true);
    setCurrentScreen('CHECKLIST');
  };

  const handleRescan = () => {
    setCaptures([]);
    setCurrentScreen('HOME_SCAN');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('verify_guest_session');
    } catch (e) {
      // ignore
    }
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    storageService.clearAllData();
    setChecklistItems([]);
    setCaptures([]);
    setDetectedItems([]);
    setCurrentUser(null);
    setCurrentScreen('LOGIN');
    setIsAuthModalOpen(false);
  };

  const handleNavBack = () => {
    if (!currentUser) {
      setCurrentScreen('LOGIN');
      return;
    }
    switch (currentScreen) {
      case 'WELCOME':
        // On home screen, do not force logout
        break;
      case 'HOME_SCAN':
        setCurrentScreen('WELCOME');
        break;
      case 'ANALYZING':
        setCurrentScreen('HOME_SCAN');
        break;
      case 'REVIEW':
        setCurrentScreen('HOME_SCAN');
        break;
      case 'CHECKLIST':
        setCurrentScreen('WELCOME');
        break;
      case 'HOME_LOCATION':
        setCurrentScreen('WELCOME');
        break;
      case 'LEAVING_HOME':
        setCurrentScreen('WELCOME');
        break;
      default:
        break;
    }
  };

  const handleNavHome = () => {
    if (!currentUser) {
      setCurrentScreen('LOGIN');
      return;
    }
    setCurrentScreen('WELCOME');
  };

  // Compute unverified items count for departure notification
  const unverifiedItems = checklistItems.filter(
    i => !(i.lastVerified?.verified || i.isManuallyChecked)
  );

  return (
    <div className="min-h-screen w-full bg-[#EBEBE0] text-[#2C2C24] flex flex-col items-center justify-center sm:p-4 md:p-6 select-none font-sans">
      {/* Outer Device Frame Container for desktop, full width on mobile */}
      <div className="w-full max-w-md h-[100dvh] sm:h-[840px] bg-[#F5F5F0] text-[#2C2C24] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DCDCC8] relative">
        {/* Android Punch-hole Camera simulation on desktop */}
        <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#2C2C24] border border-[#DCDCC8] z-40 items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]/50" />
        </div>

        {/* Android Status Bar */}
        <AndroidStatusBar />

        {/* Android Heads-Up Departure Notification Banner (when user steps outside geofence) */}
        {showNotificationBanner && (
          <div className="absolute top-8 left-0 right-0 z-50 px-3">
            <DepartureNotificationBanner
              event={latestDepartureEvent}
              distanceMeters={locationState.distanceMeters ?? 260}
              unverifiedItems={unverifiedItems}
              onOpenLeavingHome={handleGoToLeavingHome}
              onDismiss={() => setShowNotificationBanner(false)}
            />
          </div>
        )}

        {/* Screen Content Switcher */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentScreen === 'LOGIN' && (
            <LoginScreen
              onLoginSuccess={(user) => {
                setCurrentUser(user);
                setCurrentScreen('WELCOME');
              }}
            />
          )}

          {currentScreen === 'WELCOME' && (
            <WelcomeScreen
              onStartScan={handleStartScan}
              onResumeChecklist={checklistItems.length > 0 ? handleResumeChecklist : undefined}
              onGoToLocationSetup={handleGoToLocationSetup}
              onGoToLeavingHome={handleGoToLeavingHome}
              onVerifyDefaultChecklist={handleVerifyDefaultChecklist}
              savedItemCount={checklistItems.length}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              onGoToLogin={() => setCurrentScreen('LOGIN')}
            />
          )}

          {currentScreen === 'HOME_SCAN' && (
            <HomeScanScreen
              onAnalyze={handleStartAnalysis}
              onCancel={() => setCurrentScreen(checklistItems.length > 0 ? 'CHECKLIST' : 'WELCOME')}
              initialCaptures={captures}
            />
          )}

          {currentScreen === 'ANALYZING' && (
            <AnalysisLoadingScreen
              captures={captures}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
              onCancel={() => setCurrentScreen('HOME_SCAN')}
            />
          )}

          {currentScreen === 'REVIEW' && (
            <ReviewHomeScreen
              items={detectedItems}
              onConfirm={handleConfirmReview}
              onRescan={handleRescan}
            />
          )}

          {currentScreen === 'CHECKLIST' && (
            <ChecklistScreen
              items={checklistItems}
              onUpdateItems={handleUpdateChecklistItems}
              onRescan={handleRescan}
              onGoToLocationSetup={handleGoToLocationSetup}
              onGoToLeavingHome={handleGoToLeavingHome}
              onBack={handleNavBack}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'HOME_LOCATION' && (
            <HomeLocationScreen
              onGoToLeavingHome={handleGoToLeavingHome}
            />
          )}

          {currentScreen === 'LEAVING_HOME' && (
            <LeavingHomeScreen
              items={checklistItems}
              onUpdateItems={handleUpdateChecklistItems}
              onGoToLocationSetup={handleGoToLocationSetup}
              onGoToChecklist={() => setCurrentScreen('CHECKLIST')}
              onBack={handleNavBack}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
            />
          )}
        </main>

        {/* Auth & Cloud Sync Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          checklistItems={checklistItems}
          onUpdateItems={handleUpdateChecklistItems}
          onLogout={handleLogout}
        />

        {/* Android Bottom Navigation Pill */}
        <AndroidNavBar
          canGoBack={currentUser !== null && currentScreen !== 'WELCOME'}
          onBack={handleNavBack}
          onHome={handleNavHome}
        />
      </div>
    </div>
  );
}

