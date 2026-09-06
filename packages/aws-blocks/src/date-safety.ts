export const DATE_SAFETY_GEOFENCE_MILES = 0.25;

export type DateSafetyAction =
  | "call_authorities"
  | "contact_emergency_contact"
  | "contact_venue"
  | "start_recording";

export const isWithinDateSafetyGeofence = (
  distanceMiles: number | null | undefined
) =>
  distanceMiles !== null &&
  distanceMiles !== undefined &&
  Number.isFinite(distanceMiles) &&
  distanceMiles <= DATE_SAFETY_GEOFENCE_MILES;

export const roundSafetyDistance = (distanceMiles: number) =>
  Math.round(distanceMiles * 1000) / 1000;
