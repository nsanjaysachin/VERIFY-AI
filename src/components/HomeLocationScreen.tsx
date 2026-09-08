import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Compass, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Shield, 
  Eye, 
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { HomeLocation, LocationMonitorState } from '../types';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { formatDistanceKm, formatRadiusKm } from '../utils/distance';

interface HomeLocationScreenProps {
  onGoToLeavingHome: () => void;
}

const PRESET_RADII = [100, 200, 300, 500];

export const HomeLocationScreen: React.FC<HomeLocationScreenProps> = ({
  onGoToLeavingHome,
}) => {
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(() => storageService.getHomeLocation());
  const [locationState, setLocationState] = useState<LocationMonitorState>(() => locationService.getState());
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCustomRadius, setIsCustomRadius] = useState<boolean>(
    Boolean(homeLocation && !PRESET_RADII.includes(homeLocation.radiusMeters))
  );
  const [customRadiusValue, setCustomRadiusValue] = useState<number>(
    homeLocation?.radiusMeters ?? 200
  );
  const [addressInput, setAddressInput] = useState<string>(
    homeLocation?.address || ''
  );
  const [isLiveWatching, setIsLiveWatching] = useState<boolean>(false);
  const [notificationPerm, setNotificationPerm] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to location service updates
  useEffect(() => {
    const unsubscribe = locationService.subscribe((state) => {
      setLocationState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Sync canvas radar visualization whenever homeLocation or locationState changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas with deep organic dark neutral for high contrast radar
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#24241E';
    ctx.fillRect(0, 0, width, height);

    // Grid lines / concentric distance rings
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#38382E';

    // 3 subtle background reference rings
    [width * 0.2, width * 0.35, width * 0.45].forEach((r) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, height - 15);
    ctx.moveTo(15, centerY);
    ctx.lineTo(width - 15, centerY);
    ctx.stroke();

    if (!homeLocation) {
      // Home is not set yet: draw clean unconfigured state
      ctx.fillStyle = '#7A7A6A';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO HOME LOCATION SET', centerX, centerY - 6);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#5A5A40';
      ctx.fillText('Lock GPS below to arm geofence', centerX, centerY + 14);
      return;
    }

    // Scale calculation: let home radius fit nicely inside the canvas
    const maxVisualRadius = width * 0.32;
    const scale = maxVisualRadius / homeLocation.radiusMeters;

    // Draw Configured Geofence Radius
    const geofencePixelRadius = homeLocation.radiusMeters * scale;
    const isOutside = (locationState.distanceMeters ?? 0) > homeLocation.radiusMeters;

    // Radius zone fill
    ctx.beginPath();
    ctx.arc(centerX, centerY, geofencePixelRadius, 0, Math.PI * 2);
    ctx.fillStyle = isOutside ? 'rgba(90, 90, 64, 0.15)' : 'rgba(90, 90, 64, 0.25)';
    ctx.fill();

    // Radius boundary ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, geofencePixelRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#A0B080';
    ctx.stroke();
    ctx.setLineDash([]);

    // Home Center Pin
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#F5F5F0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5A5A40';
    ctx.stroke();

    // Draw "HOME" label
    ctx.fillStyle = '#EBEBE0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOME', centerX, centerY + 18);

    // Draw User Current Location Pin if known
    const distanceMeters = locationState.distanceMeters ?? 0;
    // Map current distance along a 45 degree angle for visual representation
    const angle = Math.PI / 4;
    const userPixelDist = Math.min(distanceMeters * scale, width * 0.45);
    const userX = centerX + Math.cos(angle) * userPixelDist;
    const userY = centerY - Math.sin(angle) * userPixelDist;

    // Distance vector line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(userX, userY);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isOutside ? '#E07060' : '#8A9A70';
    ctx.stroke();

    // User pin
    ctx.beginPath();
    ctx.arc(userX, userY, 7, 0, Math.PI * 2);
    ctx.fillStyle = isOutside ? '#C85A48' : '#5A5A40';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // User pulse ring
    ctx.beginPath();
    ctx.arc(userX, userY, 12, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isOutside ? 'rgba(200, 90, 72, 0.6)' : 'rgba(160, 176, 128, 0.6)';
    ctx.stroke();

    // Distance Label in kilometers
    ctx.fillStyle = isOutside ? '#FFA090' : '#DCDCC8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatDistanceKm(distanceMeters), userX + 12, userY + 3);
  }, [homeLocation, locationState]);

  // Set Current Device Location as Home
  const handleSetCurrentLocationAsHome = async () => {
    setIsAcquiringGps(true);
    setGpsError(null);
    try {
      const pos = await locationService.getCurrentDevicePosition();
      const updated: HomeLocation = {
        latitude: Number(pos.lat.toFixed(6)),
        longitude: Number(pos.lng.toFixed(6)),
        radiusMeters: homeLocation?.radiusMeters ?? customRadiusValue ?? 200,
        label: 'My Home',
        address: addressInput || `GPS: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`,
        updatedAt: Date.now(),
      };
      setHomeLocation(updated);
      storageService.saveHomeLocation(updated);

      // Immediately evaluate position relative to new home
      locationService.evaluatePosition(pos.lat, pos.lng, pos.accuracy, false);
    } catch (e: any) {
      setGpsError(e.message || 'Could not access device GPS.');
    } finally {
      setIsAcquiringGps(false);
    }
  };

  const handleClearHomeLocation = () => {
    setHomeLocation(null);
    storageService.clearHomeLocation();
    locationService.init();
  };

  // Change Radius Selection
  const handleSelectRadius = (meters: number) => {
    setIsCustomRadius(false);
    setCustomRadiusValue(meters);
    if (homeLocation) {
      const updated: HomeLocation = {
        ...homeLocation,
        radiusMeters: meters,
        updatedAt: Date.now(),
      };
      setHomeLocation(updated);
      storageService.saveHomeLocation(updated);

      // Re-evaluate current position with updated radius
      if (locationState.currentLat !== null && locationState.currentLng !== null) {
        locationService.evaluatePosition(
          locationState.currentLat,
          locationState.currentLng,
          locationState.accuracyMeters,
          false
        );
      }
    }
  };

  const handleApplyCustomRadius = (meters: number) => {
    setCustomRadiusValue(meters);
    if (homeLocation) {
      const updated: HomeLocation = {
        ...homeLocation,
        radiusMeters: meters,
        updatedAt: Date.now(),
      };
      setHomeLocation(updated);
      storageService.saveHomeLocation(updated);

      if (locationState.currentLat !== null && locationState.currentLng !== null) {
        locationService.evaluatePosition(
          locationState.currentLat,
          locationState.currentLng,
          locationState.accuracyMeters,
          false
        );
      }
    }
  };

  const handleToggleLiveWatching = () => {
    if (isLiveWatching) {
      locationService.stopLiveWatching();
      setIsLiveWatching(false);
    } else {
      locationService.startLiveWatching();
      setIsLiveWatching(true);
    }
  };

  const handleRequestNotification = async () => {
    const perm = await locationService.requestNotificationPermission();
    setNotificationPerm(perm);
  };

  const isDeparted = locationState.status === 'OUTSIDE';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F0] text-[#2C2C24] overflow-y-auto">
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-white border-b border-[#EBEBE0] flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-[#2C2C24]">
            Home Location
          </h1>
        </div>

        <button
          type="button"
          onClick={onGoToLeavingHome}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#5A5A40] text-white hover:bg-[#4C4C36] transition-colors"
        >
          Checklist →
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full pb-8">
        {/* Radar & Live Status Card */}
        <div className="bg-white rounded-[24px] p-4 border border-[#EBEBE0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#5A5A40]" />
              <span className="text-xs font-semibold text-[#2C2C24]">
                Geofence Radar
              </span>
            </div>
            {/* Status Pill */}
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                !homeLocation
                  ? 'bg-[#7A7A6A]/15 text-[#7A7A6A]'
                  : isDeparted
                  ? 'bg-[#C85A48]/15 text-[#C85A48]'
                  : 'bg-[#5A5A40]/15 text-[#5A5A40]'
              }`}
            >
              {!homeLocation ? 'Location Not Set' : isDeparted ? 'Outside Home' : 'At Home'}
            </span>
          </div>

          {/* Interactive Visual Canvas */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[#DCDCC8] flex items-center justify-center bg-[#24241E] shadow-inner">
            <canvas
              ref={canvasRef}
              width={340}
              height={255}
              className="w-full h-full object-contain"
            />
            {/* Overlay Info Badges */}
            <div className="absolute top-2 left-2 bg-[#2C2C24]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-[#EBEBE0]">
              Radius: <strong className="text-white">
                {formatRadiusKm(homeLocation ? homeLocation.radiusMeters : customRadiusValue)}
              </strong>
            </div>
            <div className="absolute bottom-2 right-2 bg-[#2C2C24]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-[#EBEBE0]">
              Current: <strong className={isDeparted ? 'text-[#FFA090]' : 'text-[#A0B080]'}>
                {homeLocation 
                  ? `${formatDistanceKm(locationState.distanceMeters)} away` 
                  : 'GPS ready to calibrate'}
              </strong>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#7A7A6A] pt-2 border-t border-[#EBEBE0]">
            <span className="flex items-center gap-1.5 text-[#5A5A40] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse" />
              Live Device GPS
            </span>
            <span>
              Geofence: {homeLocation 
                ? (locationState.hasTriggeredNotification ? 'Exit Alert Sent' : 'Armed & Ready') 
                : 'Awaiting Home GPS'}
            </span>
          </div>
        </div>

        {/* Home Location Coordinates Card */}
        <div className="bg-white rounded-[28px] p-5 border border-[#EBEBE0] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#5A5A40]" />
              <span className="text-xs font-bold text-[#2C2C24] uppercase tracking-wider">
                Saved Home Center
              </span>
            </div>
            {homeLocation && (
              <span className="text-[10px] text-[#7A7A6A]">
                Updated {new Date(homeLocation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {homeLocation ? (
            <>
              {/* Location Name / Label */}
              <div className="mb-3">
                <label className="text-[11px] font-medium text-[#7A7A6A] block mb-1">
                  Residence Label
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    const updated = { ...homeLocation, address: e.target.value };
                    setHomeLocation(updated);
                    storageService.saveHomeLocation(updated);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F0] border border-[#DCDCC8] text-xs font-medium text-[#2C2C24] focus:outline-none focus:border-[#5A5A40]"
                  placeholder="e.g. My Residence"
                />
              </div>

              {/* Coordinates display */}
              <div className="grid grid-cols-2 gap-2 mb-4 bg-[#F5F5F0] p-3 rounded-2xl border border-[#EBEBE0]">
                <div>
                  <span className="text-[10px] text-[#7A7A6A] uppercase font-bold block">Latitude</span>
                  <span className="font-mono text-xs font-bold text-[#2C2C24]">{homeLocation.latitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A7A6A] uppercase font-bold block">Longitude</span>
                  <span className="font-mono text-xs font-bold text-[#2C2C24]">{homeLocation.longitude}</span>
                </div>
              </div>

              {/* Update & Clear Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSetCurrentLocationAsHome}
                  disabled={isAcquiringGps}
                  className="w-full py-3 px-4 rounded-full bg-[#5A5A40] hover:bg-[#4C4C36] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Navigation className={`w-4 h-4 ${isAcquiringGps ? 'animate-spin' : ''}`} />
                  <span>{isAcquiringGps ? 'Acquiring GPS Fix...' : 'Update to Current GPS Location'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearHomeLocation}
                  className="w-full py-2 px-4 rounded-full text-xs font-semibold text-[#7A7A6A] hover:text-[#C85A48] hover:bg-[#F9F9F4] transition-colors"
                >
                  Clear Home Location
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <p className="text-xs text-[#7A7A6A] leading-relaxed">
                No home location has been set yet. When you are at home, click the button below to lock your device&apos;s current GPS position as your residence.
              </p>
              <button
                type="button"
                onClick={handleSetCurrentLocationAsHome}
                disabled={isAcquiringGps}
                className="w-full py-3 px-4 rounded-full bg-[#5A5A40] hover:bg-[#4C4C36] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 ${isAcquiringGps ? 'animate-spin' : ''}`} />
                <span>{isAcquiringGps ? 'Acquiring GPS Fix...' : 'Set Current Location as Home'}</span>
              </button>
            </div>
          )}

          {gpsError && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-[#FFF9F9] border border-[#C85A48]/30 flex items-center gap-2 text-[11px] text-[#C85A48]">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Configurable Departure Radius */}
        <div className="bg-white rounded-[28px] p-5 border border-[#EBEBE0] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#5A5A40]" />
              <span className="text-xs font-bold text-[#2C2C24] uppercase tracking-wider">
                Departure Radius
              </span>
            </div>
            <span className="text-xs font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-2.5 py-0.5 rounded-full">
              {formatRadiusKm(homeLocation ? homeLocation.radiusMeters : customRadiusValue)}
            </span>
          </div>
          <p className="text-xs text-[#7A7A6A] mb-3.5">
            VERIFY triggers a departure alert when your device moves beyond this perimeter.
          </p>

          {/* Presets buttons in km */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_RADII.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => handleSelectRadius(radius)}
                className={`py-2 px-2 rounded-2xl text-xs font-bold transition-all ${
                  !isCustomRadius && (homeLocation?.radiusMeters ?? customRadiusValue) === radius
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'bg-[#F5F5F0] text-[#7A7A6A] border border-[#DCDCC8] hover:bg-[#EBEBE0]'
                }`}
              >
                {(radius / 1000).toFixed(1)} km
              </button>
            ))}
          </div>

          {/* Custom Radius Toggle & Slider in km */}
          <div className="pt-2 border-t border-[#EBEBE0]">
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={() => setIsCustomRadius(!isCustomRadius)}
                className="text-xs font-semibold text-[#5A5A40] hover:underline flex items-center gap-1"
              >
                <span>Custom Radius</span>
              </button>
              {isCustomRadius && (
                <span className="text-xs font-mono font-bold text-[#2C2C24]">
                  {formatRadiusKm(customRadiusValue)}
                </span>
              )}
            </div>

            {isCustomRadius && (
              <div className="space-y-2 mt-2">
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={customRadiusValue}
                  onChange={(e) => handleApplyCustomRadius(Number(e.target.value))}
                  className="w-full accent-[#5A5A40] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#7A7A6A]">
                  <span>0.05 km (Tight)</span>
                  <span>0.50 km</span>
                  <span>2.00 km (Wide)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Guarantee Note */}
        <div className="p-4 rounded-[24px] bg-white border border-[#EBEBE0] text-[#7A7A6A] space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2C2C24]">
            <Shield className="w-4 h-4 text-[#5A5A40]" />
            <span>Local Privacy Guarantee</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your location is evaluated 100% on your device solely to calculate distance to your home radius. Your GPS coordinates are never uploaded to any cloud server or third party.
          </p>
        </div>

        {/* Go to Leaving Home Screen CTA */}
        <button
          type="button"
          onClick={onGoToLeavingHome}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#5A5A40] hover:bg-[#4C4C36] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span>Open &ldquo;Leaving Home&rdquo; Checklist Screen</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
