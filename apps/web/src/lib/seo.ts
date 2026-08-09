export const SITE_ORIGIN = "https://chewbuu.com";
export const SITE_NAME = "Chewbuu";
export const SITE_TAGLINE = "Real People, Real Dates, Real Results.";
export const SITE_TITLE = `${SITE_NAME} | ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "Chewbuu helps verified people request dates, choose nearby spots, chat with matches, and post recaps after the date happens.";
export const OG_IMAGE_PATH = "/og/chewbuu-home.png";
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}`;

export const getCanonicalUrl = (path = "/") =>
  new URL(path, SITE_ORIGIN).toString();
