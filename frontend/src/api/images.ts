import { apiClient } from "./client";
import type { Photo } from "../types/image";

/** Destination photo via the backend Unsplash proxy (null = no result/no key). */
export async function searchImage(query: string): Promise<Photo | null> {
  const { data } = await apiClient.get<{ photo: Photo | null }>("/images", {
    params: { query },
  });
  return data.photo;
}
