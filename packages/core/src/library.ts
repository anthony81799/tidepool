import { getUserViewApi } from "@jellyfin/sdk/lib/utils/api/user-view-api";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { getImageApi } from "@jellyfin/sdk/lib/utils/api/image-api";
import type { BaseItemDto, BaseItemKind } from "@jellyfin/sdk/lib/generated-client";
import { isAxiosError } from "axios";
import { createApi, type Session } from "./api";
import { type Item, toItem } from "./items";

export type Library = {
  id: string;
  name: string;
  type: "movies" | "tvshows" | "music" | "books";
  primaryImageTag?: string | undefined;
};

const LIBRARY_ITEM_TYPES: Record<Library["type"], BaseItemKind[]> = {
  movies: ["Movie"],
  tvshows: ["Series"],
  music: ["MusicAlbum"],
  books: ["Book", "AudioBook"],
};

function toLibrary(dto: BaseItemDto): Library | null {
  if (!dto.Id || !dto.Name || !dto.CollectionType) return null;

  const base = {
    id: dto.Id,
    name: dto.Name,
    primaryImageTag: dto.ImageTags?.["Primary"] ?? undefined,
  };

  switch (dto.CollectionType) {
    case "movies":
      return { ...base, type: "movies" };
    case "tvshows":
      return { ...base, type: "tvshows" };
    case "music":
      return { ...base, type: "music" };
    case "books":
      return { ...base, type: "books" };
    default:
      return null;
  }
}

export async function getLibraries(
  session: Session,
  deviceId: string,
  deviceName: string,
): Promise<Library[] | null> {
  try {
    const data = (
      await getUserViewApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getUserViews({ userId: session.userId })
    ).data;
    return (data.Items ?? []).flatMap((dto) => toLibrary(dto) ?? []);
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return null;
  }
}

export async function getLibraryItems(
  session: Session,
  library: Library,
  deviceId: string,
  deviceName: string,
): Promise<Item[] | null> {
  try {
    const data = (
      await getLibraryApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getItems({
        userId: session.userId,
        parentId: library.id,
        recursive: true,
        includeItemTypes: LIBRARY_ITEM_TYPES[library.type],
        sortBy: ["SortName"],
        fields: ["Path", "Chapters", "Overview"],
      })
    ).data;
    return (data.Items ?? []).flatMap((dto) => toItem(dto) ?? []);
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return null;
  }
}

export function imageUrl(
  session: Session,
  itemId: string,
  tag: string,
  height: number,
  deviceId: string,
  deviceName: string,
): string {
  return getImageApi(createApi(session.serverUrl, deviceId, deviceName)).getItemImageUrlById(
    itemId,
    "Primary",
    { tag, fillHeight: height },
  );
}
