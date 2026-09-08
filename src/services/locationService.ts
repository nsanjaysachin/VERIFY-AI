/**
 * VERIFY Phase 2 — Location Intelligence Service
 * Handles Geofencing, Haversine Distance, Location Monitoring,
 * Departure Trigger Logic, and Local Simulation.
 */

import { HomeLocation, LocationMonitorState, GeofenceBoundaryStatus, DepartureEvent } from '../types';
import { storageService } from './storageService';
import { formatDistanceKm } from '../utils/distance';

/**
 * Calculates great-circle distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Computes destination coordinates given start point, bearing (degrees), and distance (meters)
 */
export function offsetCoordinates(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDegrees: number = 45
): { lat: number; lng: number } {
  const R = 6371e3;
  const delta = distanceMeters / R;
  const theta = (bearingDegrees * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    lat: Number(((phi2 * 180) / Math.PI).toFixed(6)),
    lng: Number(((lambda2 * 180) / Math.PI).toFixed(6)),
  };
}

export type LocationUpdateListener = (state: LocationMonitorState, departureEvent?: DepartureEvent) => void;

class LocationIntelligenceService {
  private currentState: LocationMonitorState = {
    currentLat: null,
    currentLng: null,
    distanceMeters: 0,
    status: 'INSIDE',
    accuracyMeters: null,
    isSimulated: false,
    hasTriggeredNotification: false,
    lastDepartureTimestamp: null,
    lastCheckedTimestamp: null,
  };

  private listeners: Set<LocationUpdateListener> = new Set();
  private departureListeners: Set<(event: DepartureEvent) => void> = new Set();
  private watchId: number | null = null;
  private isWatching: boolean = false;

  constructor() {
    // Restore persisted state if any
    const saved = storageService.getLocationState();
    if (saved) {
      this.currentState = {
        ...this.currentState,
        ...saved,
      };
    }
  }

  public init() {
    // Check if initial evaluation is needed based on saved state
    const home = storageService.getHomeLocation();
    if (home && this.currentState.currentLat !== null && this.currentState.currentLng !== null) {
      const distance = calculateDistanceMeters(
        home.latitude,
        home.longitude,
        this.currentState.currentLat,
        this.currentState.currentLng
      );
      this.currentState.distanceMeters = distance;
      this.currentState.status = distance > home.radiusMeters ? 'OUTSIDE' : 'INSIDE';
    } else {
      this.currentState.distanceMeters = null;
      this.currentState.status = 'UNKNOWN';
    }
  }

  public getState(): LocationMonitorState {
    return { ...this.currentState };
  }

  public subscribe(listener: LocationUpdateListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onDepartureEvent(callback: (event: DepartureEvent) => void): () => void {
    this.departureListeners.add(callback);
    return () => {
      this.departureListeners.delete(callback);
    };
  }

  private notifyListeners(departureEvent?: DepartureEvent) {
    const stateCopy = this.getState();
    storageService.saveLocationState(stateCopy);
    this.listeners.forEach(l => l(stateCopy, departureEvent));
    if (departureEvent) {
      this.departureListeners.forEach(cb => cb(departureEvent));
    }
  }

  /**
   * Request system permission and fetch current device location
   */
  public async getCurrentDevicePosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser environment.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          });
        },
        (error) => {
          let msg = 'Could not acquire location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied. You can set coordinates manually or test with Simulation.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location position unavailable. Check your device GPS.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * Evaluates location against home geofence and handles edge triggers
   */
  public evaluatePosition(
    lat: number,
    lng: number,
    accuracyMeters: number | null = null,
    isSimulated: boolean = false
  ): { status: GeofenceBoundaryStatus; departureTriggered: boolean; distance: number } {
    const home = storageService.getHomeLocation();
    if (!home) {
      this.currentState = {
        ...this.currentState,
        currentLat: lat,
        currentLng: lng,
        distanceMeters: null,
        status: 'UNKNOWN',
        accuracyMeters,
        isSimulated,
        lastCheckedTimestamp: Date.now(),
      };
      this.notifyListeners();
      return {
        status: 'UNKNOWN',
        departureTriggered: false,
        distance: 0,
      };
    }

    const distance = calculateDistanceMeters(home.latitude, home.longitude, lat, lng);
    const wasInside = this.currentState.status === 'INSIDE';
    const isNowOutside = distance > home.radiusMeters;
    const newStatus: GeofenceBoundaryStatus = isNowOutside ? 'OUTSIDE' : 'INSIDE';

    let departureTriggered = false;
    let departureEvent: DepartureEvent | undefined;

    // Transition: INSIDE -> OUTSIDE (and not yet notified for this departure)
    if (isNowOutside && (!this.currentState.hasTriggeredNotification || wasInside)) {
      departureTriggered = true;
      const checklist = storageService.getChecklist();
      const unverifiedItems = checklist.filter(i => !i.lastVerified?.verified && !i.isManuallyChecked);
      
      departureEvent = {
        id: `dept_${Date.now()}`,
        timestamp: Date.now(),
        distanceMeters: distance,
        unverifiedItemsCount: unverifiedItems.length,
        totalItemsCount: checklist.length,
        isSimulated,
        unverifiedItemsSample: unverifiedItems.slice(0, 4).map(i => i.object),
      };

      storageService.addDepartureEvent(departureEvent);

      // Trigger Web Browser Notification if permitted
      this.triggerWebNotification(departureEvent);

      // Audible chime & haptic feedback for physical departure alert
      this.playDepartureChime();
    }

    // Reset notification trigger if user returns inside home
    const hasTriggeredNotification = isNowOutside 
      ? (departureTriggered ? true : this.currentState.hasTriggeredNotification)
      : false; // Reset to false when inside!

    this.currentState = {
      currentLat: lat,
      currentLng: lng,
      distanceMeters: distance,
      status: newStatus,
      accuracyMeters,
      isSimulated,
      hasTriggeredNotification,
      lastDepartureTimestamp: departureTriggered ? Date.now() : this.currentState.lastDepartureTimestamp,
      lastCheckedTimestamp: Date.now(),
    };

    this.notifyListeners(departureEvent);

    return {
      status: newStatus,
      departureTriggered,
      distance,
    };
  }

  /**
   * Start watching live device position via Geolocation API
   */
  public startLiveWatching(): void {
    if (this.isWatching || !navigator.geolocation) return;

    this.isWatching = true;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.evaluatePosition(
          pos.coords.latitude,
          pos.coords.longitude,
          Math.round(pos.coords.accuracy),
          false
        );
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }

  public stopLiveWatching(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  /**
   * SIMULATION HELPERS
   */
  public simulateLeaveHome(
    extraDistanceMeters: number = 60,
    withSampleItems: boolean = true
  ): { distance: number; triggered: boolean } {
    let home = storageService.getHomeLocation();
    if (!home) {
      home = {
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 200,
        address: 'Home Residence',
        updatedAt: Date.now(),
      };
      storageService.saveHomeLocation(home);
    }

    // Reset previous notification state so departure triggers cleanly on simulation
    this.currentState.status = 'INSIDE';
    this.currentState.hasTriggeredNotification = false;

    const targetDistance = home.radiusMeters + extraDistanceMeters;
    const offset = offsetCoordinates(home.latitude, home.longitude, targetDistance, 45);

    const result = this.evaluatePosition(offset.lat, offset.lng, 8, true);

    // If checklist is currently empty, enrich the simulated departure event with realistic appliance alerts
    if (withSampleItems && (!storageService.getChecklist() || storageService.getChecklist().length === 0)) {
      const simulatedEvent: DepartureEvent = {
        id: `dept_${Date.now()}`,
        timestamp: Date.now(),
        distanceMeters: targetDistance,
        unverifiedItemsCount: 2,
        totalItemsCount: 2,
        isSimulated: true,
        unverifiedItemsSample: ['Gas Stove', 'Patio Door'],
      };
      storageService.addDepartureEvent(simulatedEvent);
      this.triggerWebNotification(simulatedEvent);
      this.playDepartureChime();
      this.notifyListeners(simulatedEvent);
    }

    return {
      distance: targetDistance,
      triggered: true,
    };
  }

  public simulateReturnHome(): { distance: number } {
    const home = storageService.getHomeLocation();
    if (!home) {
      return { distance: 0 };
    }
    // Simulate being 15m from home center (safely inside any radius >= 100m)
    const offset = offsetCoordinates(home.latitude, home.longitude, 15, 180);

    this.evaluatePosition(offset.lat, offset.lng, 5, true);
    return { distance: 15 };
  }

  public simulateCustomDistance(meters: number): void {
    const home = storageService.getHomeLocation();
    if (!home) return;
    const offset = offsetCoordinates(home.latitude, home.longitude, meters, 60);
    this.evaluatePosition(offset.lat, offset.lng, 10, true);
  }

  /**
   * Web Notification API
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  private triggerWebNotification(event: DepartureEvent): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const sampleText = event.unverifiedItemsSample.length > 0 
          ? `Check: ${event.unverifiedItemsSample.join(', ')}`
          : 'All items currently verified!';

        new Notification('🏠 You just left home', {
          body: `Departure detected (${formatDistanceKm(event.distanceMeters)} away). You have ${event.unverifiedItemsCount} things to check.\n${sampleText}`,
          icon: '/favicon.ico',
          tag: 'verify-departure-alert',
        });
      } catch (e) {
        console.warn('Native notification failed, in-app banner will display:', e);
      }
    }
  }

  public playDepartureChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.36); // C6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch {
      // AudioContext may require prior user interaction
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Vibration not supported or allowed
      }
    }
  }
}

export const locationService = new LocationIntelligenceService();
