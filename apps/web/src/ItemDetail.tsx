import { getItem, imageUrl, type ItemResult, type Session } from "@tidepool/core";
import { useEffect, useState } from "react";
import { DEVICE_NAME, getDeviceId } from "./device";

type Props = { session: Session; itemId: string; onBack: () => void };
type FailureReason = Extract<ItemResult, { ok: false }>["reason"];

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  "not-found": "Item not found",
  unsupported: "Item not supported",
  failed: "Failed to load item",
};

export function ItemDetail({ session, itemId, onBack }: Props) {
  const [result, setResult] = useState<ItemResult | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchItem() {
      const r = await getItem(session, itemId, getDeviceId(), DEVICE_NAME);
      if (ignore) return;
      setResult(r);
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
        </>
      )}
    </>
  );
}
