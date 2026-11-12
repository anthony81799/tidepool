import type {
  BaseItemDto,
  UserItemDataDto,
  ChapterInfo,
  NameGuidPair,
} from "@jellyfin/sdk/lib/generated-client";

type Season = {
  kind: "season";
  seriesId: string;
  seriesName: string;
  seasonNumber?: number | undefined;
};

type Episode = {
  kind: "episode";
  seriesId: string;
  seriesName: string;
  seasonId?: string | undefined;
  seasonNumber?: number | undefined;
  episodeNumber?: number | undefined;
};

type ArtistRef = { id: string; name: string };

type Album = {
  kind: "album";
  artists: ArtistRef[];
};

type Track = {
  kind: "track";
  albumId?: string | undefined;
  albumName?: string | undefined;
  artists: ArtistRef[];
  trackNumber?: number | undefined;
  discNumber?: number | undefined;
};

type Audiobook = {
  kind: "audiobook";
  chapters: { name: string; startSeconds: number }[];
};

type Comic = {
  kind: "comic";
  format: "cbz" | "cbr";
};

type Book = {
  kind: "book";
  format: "epub" | "pdf" | "mobi" | "azw3" | "fb2" | "unknown";
};

export type UserData = {
  played: boolean;
  favorite: boolean;
  playCount: number;
  positionSeconds: number;
  playedPercentage?: number | undefined;
  unplayedCount?: number | undefined;
  lastPlayed?: Date | undefined;
};

export type Item = {
  id: string;
  serverId: string;
  name: string;
  overview?: string | undefined;
  year?: number | undefined;
  runtimeSeconds?: number | undefined;
  primaryImageTag?: string | undefined;
  userData?: UserData | undefined;
} & (
  | { kind: "movie" }
  | { kind: "series" }
  | { kind: "artist" }
  | Season
  | Episode
  | Album
  | Track
  | Audiobook
  | Comic
  | Book
);

export type ItemKind = Item["kind"];

export function toUserData(dto: UserItemDataDto): UserData {
  return {
    played: dto.Played ?? false,
    favorite: dto.IsFavorite ?? false,
    playCount: dto.PlayCount ?? 0,
    positionSeconds: (dto.PlaybackPositionTicks ?? 0) / 10_000_000,
    playedPercentage: dto.PlayedPercentage ?? undefined,
    unplayedCount: dto.UnplayedItemCount ?? undefined,
    lastPlayed: dto.LastPlayedDate ? new Date(dto.LastPlayedDate) : undefined,
  };
}

const TICKS_PER_SECOND = 10_000_000;
const COMIC_FORMATS = ["cbz", "cbr"] as const;
const BOOK_FORMATS = ["epub", "pdf", "mobi", "azw3", "fb2"] as const;

function toSeconds(ticks: number | null | undefined): number | undefined {
  return ticks == null ? undefined : ticks / TICKS_PER_SECOND;
}

function toArtists(pairs: NameGuidPair[] | null | undefined): ArtistRef[] {
  return (pairs ?? []).flatMap((p) => (p.Id && p.Name ? [{ id: p.Id, name: p.Name }] : []));
}

function toChapters(chapters: ChapterInfo[] | null | undefined): Audiobook["chapters"] {
  return (chapters ?? []).map((c) => ({
    name: c.Name ?? "",
    startSeconds: (c.StartPositionTicks ?? 0) / TICKS_PER_SECOND,
  }));
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function extension(path: string | null | undefined): string {
  const dot = path ? path.lastIndexOf(".") : -1;
  return path && dot !== -1 ? path.slice(dot + 1).toLowerCase() : "";
}

export function toItem(dto: BaseItemDto): Item | null {
  if (!dto.Id || !dto.Name || !dto.ServerId) return null;

  const base = {
    id: dto.Id,
    serverId: dto.ServerId,
    name: dto.Name,
    overview: dto.Overview ?? undefined,
    year: dto.ProductionYear ?? undefined,
    runtimeSeconds: toSeconds(dto.RunTimeTicks),
    primaryImageTag: dto.ImageTags?.["Primary"] ?? undefined,
    userData: dto.UserData ? toUserData(dto.UserData) : undefined,
  };

  switch (dto.Type) {
    case "Movie":
      return { ...base, kind: "movie" };
    case "Series":
      return { ...base, kind: "series" };
    case "Season":
      if (!dto.SeriesId || !dto.SeriesName) return null;
      return {
        ...base,
        kind: "season",
        seriesId: dto.SeriesId,
        seriesName: dto.SeriesName,
        seasonNumber: dto.IndexNumber ?? undefined,
      };
    case "Episode":
      if (!dto.SeriesId || !dto.SeriesName) return null;
      return {
        ...base,
        kind: "episode",
        seriesId: dto.SeriesId,
        seriesName: dto.SeriesName,
        seasonId: dto.SeasonId ?? undefined,
        seasonNumber: dto.ParentIndexNumber ?? undefined,
        episodeNumber: dto.IndexNumber ?? undefined,
      };
    case "MusicArtist":
      return { ...base, kind: "artist" };
    case "MusicAlbum":
      return { ...base, kind: "album", artists: toArtists(dto.AlbumArtists) };
    case "Audio":
      return {
        ...base,
        kind: "track",
        albumId: dto.AlbumId ?? undefined,
        albumName: dto.Album ?? undefined,
        artists: toArtists(dto.ArtistItems),
        trackNumber: dto.IndexNumber ?? undefined,
        discNumber: dto.ParentIndexNumber ?? undefined,
      };
    case "AudioBook":
      return { ...base, kind: "audiobook", chapters: toChapters(dto.Chapters) };
    case "Book": {
      const ext = extension(dto.Path);
      if (isOneOf(COMIC_FORMATS, ext)) return { ...base, kind: "comic", format: ext };
      return { ...base, kind: "book", format: isOneOf(BOOK_FORMATS, ext) ? ext : "unknown" };
    }
    default:
      return null;
  }
}
