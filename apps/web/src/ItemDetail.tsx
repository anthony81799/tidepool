import {
  getItem,
  getItemChildren,
  imageUrl,
  type Item,
  type ItemKind,
  type ItemResult,
  type ItemsResult,
  type Session,
} from "@tidepool/core";
import { useEffect, useState } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";

type Props = { session: Session; itemId: string; onBack: () => void; onOpen: (id: string) => void };
type FailureReason = Extract<ItemResult, { ok: false }>["reason"];

function childNumber(child: Item): number | undefined {
  switch (child.kind) {
    case "episode":
      return child.episodeNumber;
    case "track":
      return child.trackNumber;
    default:
      return undefined;
  }
}

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  "not-found": "Item not found",
  unsupported: "Item not supported",
  failed: "Failed to load item",
};

const PARENT_KINDS: ReadonlySet<ItemKind> = new Set(["series", "season", "album"]);

export function ItemDetail({ session, itemId, onBack, onOpen }: Props) {
  const [result, setResult] = useState<ItemResult | null>(null);
  const [children, setChildren] = useState<ItemsResult | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchItem() {
      const itemResult = await getItem(session, itemId, getDeviceId(), DEVICE_NAME);
      const childrenResult =
        itemResult.ok && PARENT_KINDS.has(itemResult.item.kind)
          ? await getItemChildren(session, itemResult.item.id, getDeviceId(), DEVICE_NAME)
          : null;
      if (ignore) return;
      setResult(itemResult);
      setChildren(childrenResult);
    }
    void fetchItem();
    return () => {
      ignore = true;
    };
  }, [session, itemId]);

  return (
    <>
      <button onClick={onBack}>Back</button>
      {!result && <p>Loading</p>}
      {result && !result.ok && <p>{FAILURE_MESSAGES[result.reason]}</p>}
      {result?.ok && (
        <>
          {result.item.primaryImageTag && (
            <img
              src={imageUrl(
                session,
                result.item.id,
                result.item.primaryImageTag,
                450,
                getDeviceId(),
                DEVICE_NAME,
              )}
              alt=""
            />
          )}
          <h1>{result.item.name}</h1>
          {result.item.year !== undefined && <p>{result.item.year}</p>}
          {result.item.overview && <p>{result.item.overview}</p>}
          {children?.ok === false && <p>Couldn't load children</p>}
          {children?.ok &&
            children.items.map((child) => {
              const childNum = childNumber(child);
              return (
                <button
                  key={child.id}
                  onClick={() => {
                    onOpen(child.id);
                  }}
                >
                  {childNum !== undefined ? `${childNum} ${child.name}` : child.name}
                </button>
              );
            })}
        </>
      )}
    </>
  );
}
