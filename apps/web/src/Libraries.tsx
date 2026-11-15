import {
  getLibraries,
  getLibraryItems,
  imageUrl,
  type Item,
  type Library,
  type Session,
} from "@tidepool/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";
import { ItemDetail } from "./ItemDetail";
import { Search } from "./Search";

export function Libraries({ session }: { session: Session }) {
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
    <>
      {openItemId !== undefined && (
        <ItemDetail
          session={session}
          itemId={openItemId}
          onBack={() => setOpenItemIds((ids) => ids.slice(0, -1))}
          onOpen={(id) => setOpenItemIds((ids) => [...ids, id])}
          key={openItemId}
        />
      )}
      <div hidden={openItemId !== undefined}>
        {failed && <p>Couldn't load</p>}
        <div hidden={selected !== null}>
          <Search session={session} onOpen={openFromList} />
        </div>
        {!selected &&
          libraries?.map((library) => (
            <button
              key={library.id}
              onClick={() => {
                setFailed(false);
                setItems(null);
                setSelected(library);
              }}
            >
              {library.name}
            </button>
          ))}
        {selected && (
          <>
            <button
              onClick={() => {
                setFailed(false);
                setSelected(null);
                setItems(null);
              }}
            >
              Back
            </button>
            <div className="poster-grid">
              {items?.map((item) => (
                <button key={item.id} onClick={() => openFromList(item.id)}>
                  {item.primaryImageTag && (
                    <img
                      src={imageUrl(
                        session,
                        item.id,
                        item.primaryImageTag,
                        300,
                        getDeviceId(),
                        DEVICE_NAME,
                      )}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
