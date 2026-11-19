import type { Item } from "@tidepool/core";

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function formatRuntime(seconds: number | undefined, clock = false): string | undefined {
  if (seconds === undefined || seconds <= 0) return undefined;
  const total = Math.round(seconds);
  if (clock) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function itemSubtitle(item: Item): string | undefined {
  switch (item.kind) {
    case "episode":
    case "season":
      return item.seriesName;
    case "album":
      return item.artists.map((a) => a.name).join(", ") || undefined;
    case "track":
      return item.artists.map((a) => a.name).join(", ") || item.albumName;
    default:
      return item.year?.toString();
  }
}

export function posterShape(item: Item): "square" | "wide" | "tall" {
  switch (item.kind) {
    case "album":
    case "artist":
    case "track":
      return "square";
    case "episode":
      return "wide";
    default:
      return "tall";
  }
}
