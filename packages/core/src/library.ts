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

export type LibrariesResult = { ok: true; libraries: Library[] } | { ok: false; reason: "failed" };

export type ItemsResult = { ok: true; items: Item[] } | { ok: false; reason: "failed" };

export type ItemResult =
  | { ok: true; item: Item }
  | { ok: false; reason: "not-found" | "unsupported" | "failed" };

export type ImageType = "Primary" | "Backdrop";

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
): Promise<LibrariesResult> {
  try {
    const data = (
      await getUserViewApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getUserViews({ userId: session.userId })
    ).data;
    return { ok: true, libraries: (data.Items ?? []).flatMap((dto) => toLibrary(dto) ?? []) };
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return { ok: false, reason: "failed" };
  }
}

export async function getLibraryItems(
  session: Session,
  library: Library,
  deviceId: string,
  deviceName: string,
): Promise<ItemsResult> {
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
    return { ok: true, items: (data.Items ?? []).flatMap((dto) => toItem(dto) ?? []) };
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return { ok: false, reason: "failed" };
  }
}

export function imageUrl(
  session: Session,
  itemId: string,
  tag: string,
  height: number,
  deviceId: string,
  deviceName: string,
  type: ImageType = "Primary",
): string {
  return getImageApi(createApi(session.serverUrl, deviceId, deviceName)).getItemImageUrlById(
    itemId,
    type,
    { tag, fillHeight: height },
  );
}

export async function getItem(
  session: Session,
  itemId: string,
  deviceId: string,
  deviceName: string,
): Promise<ItemResult> {
  try {
    const data = (
      await getLibraryApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getItem({ itemId, userId: session.userId })
    ).data;
    const item = toItem(data);
    return item ? { ok: true, item } : { ok: false, reason: "unsupported" };
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    if (err.response?.status === 404) return { ok: false, reason: "not-found" };
    return { ok: false, reason: "failed" };
  }
}

export async function getItemChildren(
  session: Session,
  parentId: string,
  deviceId: string,
  deviceName: string,
): Promise<ItemsResult> {
  try {
    const data = (
      await getLibraryApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getItems({
        userId: session.userId,
        parentId,
        sortBy: ["ParentIndexNumber", "IndexNumber", "SortName"],
      })
    ).data;
    return { ok: true, items: (data.Items ?? []).flatMap((dto) => toItem(dto) ?? []) };
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return { ok: false, reason: "failed" };
  }
}
