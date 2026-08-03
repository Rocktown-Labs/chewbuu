export interface MatchCandidate {
  contributionScore: number;
  distanceMiles: number;
  interests: string[];
  reliabilityScore: number;
}

export const parseCoordinate = (value: string | null | undefined) => {
  if (value === null || value === undefined || value.trim() === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

export const hasLocation = (input: {
  area?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}) => {
  const latitude = parseCoordinate(input.latitude);
  const longitude = parseCoordinate(input.longitude);
  return Boolean(
    input.area?.trim() &&
    latitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude !== null &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const distanceBetweenMiles = (
  firstLatitude: string | null,
  firstLongitude: string | null,
  secondLatitude: string | null,
  secondLongitude: string | null
) => {
  const lat1 = parseCoordinate(firstLatitude);
  const lon1 = parseCoordinate(firstLongitude);
  const lat2 = parseCoordinate(secondLatitude);
  const lon2 = parseCoordinate(secondLongitude);
  if (
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null ||
    lat1 < -90 ||
    lat1 > 90 ||
    lat2 < -90 ||
    lat2 > 90 ||
    lon1 < -180 ||
    lon1 > 180 ||
    lon2 < -180 ||
    lon2 > 180
  ) {
    return null;
  }

  const firstLatRadians = (lat1 * Math.PI) / 180;
  const secondLatRadians = (lat2 * Math.PI) / 180;
  const latitudeDelta = secondLatRadians - firstLatRadians;
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatRadians) *
      Math.cos(secondLatRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    3958.8 *
    2 *
    Math.atan2(
      Math.sqrt(Math.min(1, haversine)),
      Math.sqrt(1 - Math.min(1, haversine))
    )
  );
};

export const calculateMatchScore = (
  requesterInterests: string[],
  candidate: MatchCandidate
) => {
  const requesterInterestSet = new Set(
    requesterInterests.map((interest) => interest.trim().toLowerCase())
  );
  const sharedInterests = candidate.interests.filter((interest) =>
    requesterInterestSet.has(interest.trim().toLowerCase())
  ).length;
  const interestScore = Math.min(20, sharedInterests * 5);
  const distanceScore = Math.max(0, 15 - Math.round(candidate.distanceMiles));
  const reliabilityScore = Math.round(
    Math.max(0, Math.min(100, candidate.reliabilityScore)) * 0.2
  );
  const contributionScore = Math.min(
    5,
    Math.max(0, candidate.contributionScore)
  );
  return Math.min(
    100,
    40 + interestScore + distanceScore + reliabilityScore + contributionScore
  );
};

export const adjustReliabilityScore = (currentScore: number, rating: number) =>
  Math.max(0, Math.min(100, currentScore + (rating - 3) * 5));
