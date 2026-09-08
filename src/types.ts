/**
 * VERIFY - Home Safety & Energy Assistant
 * Core Data Models & Schemas
 */

export type ItemCategory = 'SAFETY' | 'ENERGY' | 'SECURITY' | 'OTHER';

export type ItemImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type VerificationMethod = 'CAMERA_AI' | 'SENSOR' | 'OFFICE_KIT' | 'MANUAL';

export type VerificationEngineType = 'ON_DEVICE' | 'CLOUD_MULTIMODAL' | 'OFFICE_KIT_SYNC';

export interface DetectedHomeItem {
  id: string;
  object: string;
  category: ItemCategory;
  room: string;
  recommended_state: string;
  reason: string;
  confidence: number;
  importance?: ItemImportance;
  verification_method?: VerificationMethod;
  enabled?: boolean;
}

export interface StateRecord {
  state: string;
  timestamp: number;
  imageThumbnail?: string;
  engine?: VerificationEngineType;
  confidence: number;
  message?: string;
}

export interface VerificationResult {
  object: string;
  detected_state: string;
  expected_state: string;
  verified: boolean;
  confidence: number;
  message: string;
  timestamp?: number;
  imageThumbnail?: string;
  engine?: VerificationEngineType;
  isLowConfidence?: boolean;
  stateTransition?: {
    before: string;
    after: string;
    changed: boolean;
  };
}

export interface ChecklistItem extends DetectedHomeItem {
  lastVerified?: VerificationResult;
  isManuallyChecked?: boolean;
  beforeState?: StateRecord;
  afterState?: StateRecord;
  history?: StateRecord[];
  officeKitSynced?: boolean;
}

export interface HomeScanCapture {
  id: string;
  dataUrl: string;
  timestamp: number;
  roomLabel?: string;
}

export type AppScreen = 
  | 'LOGIN'
  | 'WELCOME' 
  | 'HOME_SCAN' 
  | 'ANALYZING' 
  | 'REVIEW' 
  | 'CHECKLIST'
  | 'HOME_LOCATION'
  | 'LEAVING_HOME';

export interface HomeLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label?: string;
  address?: string;
  updatedAt: number;
}

export type GeofenceBoundaryStatus = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN';

export interface LocationMonitorState {
  currentLat: number | null;
  currentLng: number | null;
  distanceMeters: number | null;
  status: GeofenceBoundaryStatus;
  accuracyMeters: number | null;
  isSimulated: boolean;
  hasTriggeredNotification: boolean;
  lastDepartureTimestamp: number | null;
  lastCheckedTimestamp: number | null;
}

export interface DepartureEvent {
  id: string;
  timestamp: number;
  distanceMeters: number;
  unverifiedItemsCount: number;
  totalItemsCount: number;
  isSimulated: boolean;
  unverifiedItemsSample: string[];
}

export interface OfficeKitDevice {
  id: string;
  name: string;
  type: 'DESK_DOCK' | 'SMART_PLUG' | 'DOOR_CONTACT' | 'DISPLAY_SENSOR';
  connected: boolean;
  batteryLevel?: number;
  lastSignalTime?: number;
  telemetry?: {
    powerWatts?: number;
    contactClosed?: boolean;
    docked?: boolean;
    ambientTempC?: number;
  };
}

export interface PhoneSensorData {
  ambientLightLux: number;
  deviceMotionMagnitude: number;
  isDeviceStill: boolean;
  acousticLevelDb: number;
  orientationAlpha: number;
  orientationBeta: number;
  orientationGamma: number;
  timestamp: number;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  response: string;
  lastCommand?: string;
  error?: string | null;
}

