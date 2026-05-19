import { apiGetGallery, type GalleryImage } from "@/lib/api";
export type { GalleryImage };

export async function getCozyMomentImages(): Promise<GalleryImage[]> {
  return apiGetGallery();
}
