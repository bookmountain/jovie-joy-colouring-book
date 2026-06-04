"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type SafeImageProps = Omit<ImageProps, "alt" | "onError" | "src"> & {
  alt: string;
  fallbackLabel?: string;
  src: string | null | undefined;
};

export function SafeImage({
  alt,
  className,
  fallbackLabel = "Image unavailable",
  fill,
  src,
  style,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = src ?? "";

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <div
        aria-label={fallbackLabel}
        className={className}
        role="img"
        style={{
          alignItems: "center",
          background: "#fff4d9",
          color: "#84664a",
          display: "flex",
          fontSize: 12,
          fontWeight: 800,
          inset: fill ? 0 : undefined,
          justifyContent: "center",
          lineHeight: 1.25,
          padding: 12,
          position: fill ? "absolute" : undefined,
          textAlign: "center",
          ...style,
        }}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      fill={fill}
      onError={() => setFailed(true)}
      src={resolved}
      style={style}
    />
  );
}
