type MarketingEventProperties = Record<
  string,
  boolean | number | string | undefined
>;

declare global {
  interface Window {
    dataLayer?: MarketingEventProperties[];
  }
}

export const trackMarketingEvent = (
  event: string,
  properties: MarketingEventProperties = {}
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...properties });
};
