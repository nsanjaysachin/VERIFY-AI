/**
 * Local Storage Persistence for Phase 1
 */

import { ChecklistItem, HomeScanCapture, HomeLocation, LocationMonitorState, DepartureEvent } from '../types';

const STORAGE_KEYS = {
  CHECKLIST: 'verify_checklist_items_v1',
  CAPTURES: 'verify_scan_captures_v1',
  COMPLETED_ONBOARDING: 'verify_onboarding_completed_v1',
  HOME_LOCATION: 'verify_home_location_v1',
  LOCATION_STATE: 'verify_location_state_v1',
  DEPARTURE_EVENTS: 'verify_departure_events_v1',
};

export const storageService = {
  getChecklist(): ChecklistItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      if (!data) return [];
      const items: ChecklistItem[] = JSON.parse(data);
      // Cleanse any legacy mock / fake pre-seeded items
      const legacyMockIds = new Set(['item_gas_stove', 'item_main_door', 'item_balcony_window', 'item_bedroom_ac']);
      const genuineItems = items.filter(item => !legacyMockIds.has(item.id));
      if (genuineItems.length !== items.length) {
        this.saveChecklist(genuineItems);
      }
      return genuineItems;
    } catch (e) {
      console.error('Failed to read checklist from localStorage', e);
      return [];
    }
  },

  saveChecklist(items: ChecklistItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save checklist to localStorage', e);
    }
  },

  getHomeLocation(): HomeLocation | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HOME_LOCATION);
      if (!data) return null;
      const parsed: HomeLocation = JSON.parse(data);
      // Cleanse any legacy mock San Francisco coordinates so user starts with genuine clean slate
      if (parsed.latitude === 37.7749 && parsed.longitude === -122.4194) {
        localStorage.removeItem(STORAGE_KEYS.HOME_LOCATION);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  },

  saveHomeLocation(location: HomeLocation): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HOME_LOCATION, JSON.stringify(location));
    } catch (e) {
      console.error('Failed to save home location to localStorage', e);
    }
  },

  clearHomeLocation(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.HOME_LOCATION);
    } catch (e) {
      console.error('Failed to clear home location', e);
    }
  },

  getLocationState(): LocationMonitorState | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCATION_STATE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveLocationState(state: LocationMonitorState): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATION_STATE, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save location state', e);
    }
  },

  getDepartureEvents(): DepartureEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPARTURE_EVENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addDepartureEvent(event: DepartureEvent): void {
    try {
      const events = this.getDepartureEvents();
      // Keep up to 20 recent events
      const updated = [event, ...events].slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.DEPARTURE_EVENTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save departure event', e);
    }
  },

  updateItemVerification(itemId: string, verificationResult: any): ChecklistItem[] {
    const items = this.getChecklist();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const previous = item.lastVerified;
        const newRecord = {
          state: verificationResult.detected_state,
          timestamp: verificationResult.timestamp || Date.now(),
          imageThumbnail: verificationResult.imageThumbnail,
          engine: verificationResult.engine,
          confidence: verificationResult.confidence,
          message: verificationResult.message,
        };

        const history = [...(item.history || [])];
        if (previous) {
          history.push({
            state: previous.detected_state,
            timestamp: previous.timestamp || Date.now(),
            imageThumbnail: previous.imageThumbnail,
            engine: previous.engine,
            confidence: previous.confidence,
            message: previous.message,
          });
        }
        history.push(newRecord);

        return {
          ...item,
          beforeState: previous
            ? {
                state: previous.detected_state,
                timestamp: previous.timestamp || Date.now(),
                imageThumbnail: previous.imageThumbnail,
                engine: previous.engine,
                confidence: previous.confidence,
              }
            : item.beforeState,
          afterState: newRecord,
          history,
          lastVerified: verificationResult,
        };
      }
      return item;
    });
    this.saveChecklist(updated);
    return updated;
  },

  initializeStandardHouseholdChecklist(): ChecklistItem[] {
    return [];
  },

  getSavedCaptures(): HomeScanCapture[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CAPTURES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCaptures(captures: HomeScanCapture[]): void {
    try {
      // Keep only last 8 captures to avoid exceeding localStorage quota
      const trimmed = captures.slice(-8);
      localStorage.setItem(STORAGE_KEYS.CAPTURES, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not store full photo history in localStorage, memory kept.');
    }
  },

  hasCompletedOnboarding(): boolean {
    return localStorage.getItem(STORAGE_KEYS.COMPLETED_ONBOARDING) === 'true';
  },

  setOnboardingCompleted(completed: boolean): void {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_ONBOARDING, String(completed));
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.CHECKLIST);
    localStorage.removeItem(STORAGE_KEYS.CAPTURES);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_ONBOARDING);
  },
};
