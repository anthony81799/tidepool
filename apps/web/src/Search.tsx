import {
  searchItems,
  groupByKind,
  type ItemKind,
  type ItemsByKind,
  type Session,
} from "@tidepool/core";
import { useEffect, useState, type ReactNode } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";
import { SearchIcon } from "./Icons";
import { PosterTile } from "./PosterTile";

type Props = {
  session: Session;
  onOpen: (id: string) => void;
  idle?: ReactNode;
};

const KIND_ORDER = [
  "movie",
  "series",
  "season",
  "episode",
  "artist",
  "album",
  "track",
  "book",
  "audiobook",
  "comic",
] as const satisfies readonly ItemKind[];

const KIND_LABELS = {
  movie: "Movies",
  series: "Shows",
  season: "Seasons",
  episode: "Episodes",
  artist: "Artists",
  album: "Albums",
  track: "Tracks",
  book: "Books",
  audiobook: "Audiobooks",
  comic: "Comics",
} satisfies Record<ItemKind, string>;

export function Search({ session, onOpen, idle }: Props) {
  const [groups, setGroups] = useState<ItemsByKind | null>(null);
  const [failed, setFailed] = useState(false);
  const [term, setTerm] = useState("");

  useEffect(() => {
    let ignore = false;
    async function runSearch() {
      const result = await searchItems(session, term, getDeviceId(), DEVICE_NAME);
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- cleanup sets ignore during the await
      if (ignore) return;
      if (result.ok) {
        setFailed(false);
        setGroups(groupByKind(result.items));
      } else {
        setFailed(true);
        setGroups(null);
      }
    }

    const timerId = setTimeout(() => void runSearch(), 300);
    return () => {
      ignore = true;
      clearTimeout(timerId);
    };
  }, [session, term]);

  const hasTerm = term.trim().length !== 0;

  return (
    <search className="search">
      <label className="search-field">
        <SearchIcon size={22} />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search movies, shows, music and books"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      {failed && (
        <p role="alert" className="notice">
          Search didn't reach the server. Check your connection and try again.
        </p>
      )}
      {!hasTerm && idle}
      {hasTerm && groups !== null && Object.keys(groups).length === 0 && (
        <p className="empty">Nothing matches “{term.trim()}”.</p>
      )}
      {groups &&
        KIND_ORDER.map((kind) => {
          const items = groups[kind];
          if (!items) return null;
          return (
            <section key={kind} className="result-group">
              <h2 className="section-title">
                {KIND_LABELS[kind]}
                <span className="count">{items.length}</span>
              </h2>
              <div className="poster-grid">
                {items.map((item) => (
                  <PosterTile key={item.id} session={session} item={item} onOpen={onOpen} />
                ))}
              </div>
            </section>
          );
        })}
    </search>
  );
}
