import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { getApiUrl, spotsApi, type DatePlace } from "@/lib/dating-api";

const photoCache = new Map<string, string>();

const getDirectPhotoSource = (spot: DatePlace) => {
  const source = spot.communityPhotoUrl ?? spot.photoUrl;
  if (!source) return;
  return source.startsWith("/") ? getApiUrl(source) : source;
};

export function SpotImage({
  className = "size-24",
  spot,
}: {
  className?: string;
  spot: DatePlace;
}) {
  const directSource = getDirectPhotoSource(spot);
  const [photoSource, setPhotoSource] = useState(directSource);

  useEffect(() => {
    let isMounted = true;
    if (directSource) {
      setPhotoSource(directSource);
      return () => {
        isMounted = false;
      };
    }

    if (!spot.photoName) {
      setPhotoSource(undefined);
      return () => {
        isMounted = false;
      };
    }

    const cachedPhoto = photoCache.get(spot.photoName);
    if (cachedPhoto) {
      setPhotoSource(cachedPhoto);
      return () => {
        isMounted = false;
      };
    }

    setPhotoSource(undefined);
    const loadPhoto = async () => {
      try {
        const photo = await spotsApi.getPhoto(spot.photoName as string);
        const nextSource = `data:${photo.contentType};base64,${photo.data}`;
        photoCache.set(spot.photoName as string, nextSource);
        if (isMounted) setPhotoSource(nextSource);
      } catch {
        // The rounded placeholder remains the honest state when Google media is unavailable.
      }
    };
    void loadPhoto();

    return () => {
      isMounted = false;
    };
  }, [directSource, spot.photoName]);

  if (photoSource) {
    return (
      <img
        alt={spot.name}
        className={`${className} shrink-0 rounded-2xl object-cover`}
        height={96}
        loading="lazy"
        src={photoSource}
        width={96}
      />
    );
  }

  return (
    <div
      aria-label={`${spot.name} photo unavailable`}
      className={`${className} flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-primary/15 bg-primary/10 px-2 text-center text-primary`}
      role="img"
    >
      <MapPin aria-hidden="true" className="size-5" />
      <span className="text-[9px] font-semibold leading-tight">
        Be first to share
      </span>
    </div>
  );
}
