import { Image as UnpicImage } from "@unpic/react";
import type { ImageProps as UnpicImageProps } from "@unpic/react";

export type ImageProps = UnpicImageProps;

export function Image({
  alt = "",
  layout = "constrained",
  ...props
}: ImageProps) {
  return <UnpicImage alt={alt} layout={layout} {...props} />;
}

export { UnpicImage };
