export const getNearbySpotsArea = (
  currentLocation?: string,
  profileArea?: string
) => currentLocation?.trim() || profileArea?.trim() || "";

export const getNearbySpotsFilters = (query?: string) => {
  const normalizedQuery = query?.trim();
  return normalizedQuery ? [normalizedQuery] : [];
};
