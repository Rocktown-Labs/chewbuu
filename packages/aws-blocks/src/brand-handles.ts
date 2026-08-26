export const RESERVED_BRAND_HANDLES = new Set(["chewbuu", "chewbuusync"]);

const normalizeBrandToken = (value: string) =>
  value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "");

export const isReservedBrandHandle = (handle: string) => {
  const normalized = normalizeBrandToken(handle);
  return Array.from(RESERVED_BRAND_HANDLES).some((reserved) =>
    normalized.includes(normalizeBrandToken(reserved))
  );
};

export const isReservedBrandName = (name: string) =>
  isReservedBrandHandle(name);
