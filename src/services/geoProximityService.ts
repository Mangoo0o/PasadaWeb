/**
 * Geo Proximity Service
 * Handles distance calculations, proximity boundary checks, and formatters for PasadaWeb dispatches.
 */

export const MAX_DISPATCH_RADIUS_KM = 1.0; // Strict 1.0 km radius limit

/**
 * Calculates the great-circle distance between two geographic coordinates in kilometers
 * using the Haversine formula.
 */
export function getDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if two coordinates are within the dispatch radius (default 1.0 km).
 */
export function isWithinDispatchRadius(
  driverLat?: number | null,
  driverLng?: number | null,
  pickupLat?: number | null,
  pickupLng?: number | null,
  maxRadiusKm: number = MAX_DISPATCH_RADIUS_KM
): boolean {
  const distance = getDistanceKm(driverLat, driverLng, pickupLat, pickupLng);
  return distance <= maxRadiusKm;
}

/**
 * Formats a distance in kilometers into a human-friendly string (e.g., '450 m' or '0.8 km').
 */
export function formatProximityDistance(distanceKm: number, _language: string = 'fil'): string {
  if (!Number.isFinite(distanceKm)) return '--';
  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
