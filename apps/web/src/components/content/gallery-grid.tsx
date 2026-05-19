import Image from "next/image";
import { cozyMomentImages } from "@/data/gallery";

export function GalleryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cozyMomentImages.map((image, index) => (
        <div
          className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-blush shadow-soft"
          key={`${image.src}-${index}`}
        >
          <Image
            alt={image.alt}
            className="h-full w-full object-cover"
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            src={image.src}
          />
        </div>
      ))}
    </div>
  );
}
