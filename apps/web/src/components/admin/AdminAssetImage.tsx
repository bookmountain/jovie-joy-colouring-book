"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { resolveAssetUrl } from "@/lib/api";

type AdminAssetImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fallbackLabel?: string;
  onClick?: () => void;
  onLoad?: (dims: { w: number; h: number }) => void;
};

export function AdminAssetImage({
  src,
  alt,
  className,
  style,
  fallbackLabel = "Image unavailable",
  onClick,
  onLoad,
}: AdminAssetImageProps) {
  const resolved = resolveAssetUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <div
        aria-label={fallbackLabel}
        className={className}
        onClick={onClick}
        role="img"
        style={{
          alignItems: "center",
          background: "#fef0d4",
          color: "var(--admin-muted)",
          display: "flex",
          fontSize: 10,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          lineHeight: 1.2,
          padding: 6,
          textAlign: "center",
          width: "100%",
          ...style,
        }}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setFailed(true)}
      onLoad={(e) => {
        const img = e.currentTarget;
        onLoad?.({ w: img.naturalWidth, h: img.naturalHeight });
      }}
      src={resolved}
      style={style}
    />
  );
}
