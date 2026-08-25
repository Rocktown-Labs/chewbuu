export const normalizeConnectionString = (
  value: string | undefined
): string | undefined => {
  if (value === undefined) {
    return;
  }

  const trimmed = value.trim();
  const [quote] = trimmed;

  if (
    (quote === "'" || quote === '"') &&
    trimmed.at(-1) === quote &&
    trimmed.length > 1
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};
