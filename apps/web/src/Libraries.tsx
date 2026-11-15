import {
  getLibraries,
  getLibraryItems,
  imageUrl,
  type Item,
  type Library,
  type Session,
} from "@tidepool/core";
import { useEffect, useState } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";

export function Libraries({ session }: { session: Session }) {
  const [libraries, setLibraries] = useState<Library[] | null>(null);
  const [selected, setSelected] = useState<Library | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);

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

  return (
    <>
      {failed && <p>Couldn't load</p>}
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
              <div key={item.id}>
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
                <p>{item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
