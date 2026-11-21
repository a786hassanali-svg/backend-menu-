/**
 * Calculate Great-Circle Distance between two coordinates using Haversine Formula
 * @param {number} lat1 Latitude of point 1 (degrees)
 * @param {number} lon1 Longitude of point 1 (degrees)
 * @param {number} lat2 Latitude of point 2 (degrees)
 * @param {number} lon2 Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceMeters = R * c;
  return Math.round(distanceMeters * 100) / 100; // rounded to 2 decimal places
};

/**
 * Validate customer location against restaurant coordinates & allowed radius
 * @param {Object} customerLoc { latitude, longitude, accuracy }
 * @param {Object} restaurantLoc { latitude, longitude }
 * @param {number} allowedRadiusMeters Defaults to 300
 * @param {number} maxAccuracyToleranceMeters Max allowed GPS inaccuracy (default 1000m)
 */
export const validateCustomerProximity = (
  customerLoc,
  restaurantLoc,
  allowedRadiusMeters = 300,
  maxAccuracyToleranceMeters = 1000
) => {
  if (!customerLoc || typeof customerLoc.latitude !== 'number' || typeof customerLoc.longitude !== 'number') {
    return {
      isValid: false,
      reason: 'MISSING_COORDINATES',
      message: 'Valid GPS coordinates are required to verify table presence.',
      distanceMeters: null,
    };
  }

  // Check if restaurant has coordinates set
  if (
    !restaurantLoc ||
    typeof restaurantLoc.latitude !== 'number' ||
    typeof restaurantLoc.longitude !== 'number' ||
    (restaurantLoc.latitude === 0 && restaurantLoc.longitude === 0)
  ) {
    // If restaurant has not configured coordinates yet, allow for setup/testing
    return {
      isValid: true,
      reason: 'RESTAURANT_GEOFENCE_UNSET',
      message: 'Restaurant geofencing is currently unset.',
      distanceMeters: 0,
    };
  }

  // Reject excessively poor GPS accuracy readings
  if (customerLoc.accuracy && customerLoc.accuracy > maxAccuracyToleranceMeters) {
    return {
      isValid: false,
      reason: 'POOR_GPS_ACCURACY',
      message: `GPS reading accuracy is too low (${Math.round(customerLoc.accuracy)}m). Please turn on high-accuracy location or step outside for a clear satellite signal.`,
      distanceMeters: null,
    };
  }

  const distanceMeters = calculateHaversineDistance(
    customerLoc.latitude,
    customerLoc.longitude,
    restaurantLoc.latitude,
    restaurantLoc.longitude
  );

  if (distanceMeters > allowedRadiusMeters) {
    return {
      isValid: false,
      reason: 'OUTSIDE_RADIUS',
      message: `You are approximately ${Math.round(distanceMeters)}m away. Ordering is only permitted within ${allowedRadiusMeters}m of the restaurant.`,
      distanceMeters,
      allowedRadiusMeters,
    };
  }

  return {
    isValid: true,
    reason: 'WITHIN_RADIUS',
    message: 'Location verified successfully.',
    distanceMeters,
    allowedRadiusMeters,
  };
};

