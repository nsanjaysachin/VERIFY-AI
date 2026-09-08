/**
 * VERIFY - Distance Conversion & Formatting Utilities
 * Converts all distances and radii from raw meters to kilometers.
 */

/**
 * Formats a distance in meters into kilometers (e.g. "0.20 km", "1.45 km", "12.3 km").
 */
export function formatDistanceKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '0.00 km';
  }
  const km = meters / 1000;
  if (km < 0.01 && km > 0) {
    return `${km.toFixed(3)} km`;
  }
  if (km < 10) {
    return `${km.toFixed(2)} km`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Formats a geofence radius in meters into kilometers (e.g. 200m -> "0.20 km").
 */
export function formatRadiusKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '0.00 km';
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(2)} km`;
  }
  return `${km.toFixed(1)} km`;
}
