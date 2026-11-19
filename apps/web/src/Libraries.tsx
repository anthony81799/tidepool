import {
  getLibraries,
  getLibraryItems,
  imageUrl,
  type Item,
  type Library,
  type Session,
} from "@tidepool/core";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";
import { HomeIcon, LibraryIcon, Mark } from "./Icons";
import { ItemDetail } from "./ItemDetail";
import { PosterGridSkeleton, PosterTile } from "./PosterTile";
import { Search } from "./Search";

type Props = { session: Session; account: ReactNode };

export function Libraries({ session, account }: Props) {
  const [libraries, setLibraries] = useState<Library[] | null>(null);
  const [selected, setSelected] = useState<Library | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);

  const savedY = useRef(0);

  function openFromList(id: string) {
    savedY.current = window.scrollY;
    setOpenItemIds([id]);
  }

  function select(library: Library | null) {
    setFailed(false);
    setItems(null);
    setOpenItemIds([]);
    savedY.current = 0;
    setSelected(library);
  }

  useLayoutEffect(() => {
    if (openItemIds.length === 0) {
      window.scrollTo(0, savedY.current);
    } else {
      window.scrollTo(0, 0);
    }
  }, [openItemIds]);

  useEffect(() => {
    let ignore = false;
    async function fetchLibraries() {
      const result = await getLibraries(session, getDeviceId(), DEVICE_NAME);
      if (ignore) return;
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setLibraries(result.libraries);
    }
    void fetchLibraries();
    return () => {
      ignore = true;
    };
  }, [session]);

  useEffect(() => {
    let ignore = false;
    async function fetchItems() {
      if (!selected) return;
      const result = await getLibraryItems(session, selected, getDeviceId(), DEVICE_NAME);
      if (ignore) return;
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setItems(result.items);
    }
    void fetchItems();
    return () => {
      ignore = true;
    };
  }, [session, selected]);

  const openItemId = openItemIds.at(-1);

  return (
    <div className="shell">
      <nav className="rail" aria-label="Libraries">
        <div className="brand">
          <Mark />
          <span>Tidepool</span>
        </div>
        <ul className="rail-links">
          <li>
            <button
              className="rail-link"
              aria-current={selected === null ? "page" : undefined}
              onClick={() => select(null)}
            >
              <HomeIcon />
              Home
            </button>
          </li>
          {libraries?.map((library) => (
            <li key={library.id}>
              <button
                className="rail-link"
                aria-current={selected?.id === library.id ? "page" : undefined}
                onClick={() => select(library)}
              >
                <LibraryIcon type={library.type} />
                {library.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="rail-account">{account}</div>
      </nav>
      <main className="stage">
        {openItemId !== undefined && (
          <ItemDetail
            session={session}
            itemId={openItemId}
            onBack={() => setOpenItemIds((ids) => ids.slice(0, -1))}
            onOpen={(id) => setOpenItemIds((ids) => [...ids, id])}
            key={openItemId}
          />
        )}
        <div className="page" hidden={openItemId !== undefined}>
          {failed && (
            <p role="alert" className="notice">
              Couldn't load this library. Check that the server is running, then pick it again.
            </p>
          )}
          <div hidden={selected !== null}>
            <Search
              session={session}
              onOpen={openFromList}
              idle={
                libraries &&
                libraries.length > 0 && (
                  <section className="home-libraries">
                    <h2 className="section-title">Libraries</h2>
                    <div className="library-grid">
                      {libraries.map((library) => (
                        <button
                          key={library.id}
                          className="library-tile"
                          aria-label={library.name}
                          onClick={() => select(library)}
                        >
                          {library.primaryImageTag ? (
                            <img
                              src={imageUrl(
                                session,
                                library.id,
                                library.primaryImageTag,
                                360,
                                getDeviceId(),
                                DEVICE_NAME,
                              )}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="library-tile-name">
                              <LibraryIcon type={library.type} />
                              {library.name}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )
              }
            />
          </div>
          {selected && (
            <section>
              <header className="page-header">
                <h1 className="page-title">{selected.name}</h1>
                {items && (
                  <p className="page-meta">
                    {items.length} {items.length === 1 ? "title" : "titles"}
                  </p>
                )}
              </header>
              {!failed && items === null && <PosterGridSkeleton />}
              {items?.length === 0 && <p className="empty">This library is empty.</p>}
              <div className="poster-grid">
                {items?.map((item) => (
                  <PosterTile key={item.id} session={session} item={item} onOpen={openFromList} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
