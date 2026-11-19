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
import { formatRuntime, itemSubtitle, posterShape } from "./format";
import { BackIcon } from "./Icons";
import { PosterTile } from "./PosterTile";

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
  "not-found": "This item doesn't exist or your account can't open it.",
  unsupported: "Tidepool can't show this kind of item yet.",
  failed: "Couldn't load this item. Check that the server is running, then try again.",
};

const PARENT_KINDS: ReadonlySet<ItemKind> = new Set(["series", "season", "album"]);

const CHILDREN_TITLES: Partial<Record<ItemKind, string>> = {
  series: "Seasons",
  season: "Episodes",
  album: "Tracks",
};

function metaParts(item: Item): string[] {
  const parts: string[] = [];
  if (item.kind === "episode" && item.seasonNumber !== undefined) {
    parts.push(
      item.episodeNumber === undefined
        ? `Season ${item.seasonNumber}`
        : `Season ${item.seasonNumber}, episode ${item.episodeNumber}`,
    );
  }
  if (item.year !== undefined) parts.push(String(item.year));
  const runtime = formatRuntime(item.runtimeSeconds);
  if (runtime !== undefined && item.kind !== "series" && item.kind !== "season") {
    parts.push(runtime);
  }
  return parts;
}

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

  const item = result?.ok ? result.item : null;
  const subtitle =
    item && item.kind !== "movie" && item.kind !== "series" ? itemSubtitle(item) : undefined;

  return (
    <article className="detail">
      <div className="hero">
        {item?.backdrop && (
          <img
            src={imageUrl(
              session,
              item.backdrop.itemId,
              item.backdrop.tag,
              1080,
              getDeviceId(),
              DEVICE_NAME,
              "Backdrop",
            )}
            alt=""
            className="hero-backdrop"
          />
        )}
        <button className="icon-button back-button" onClick={onBack} aria-label="Back">
          <BackIcon size={22} />
        </button>
      </div>
      <div className="detail-body">
        {!result && <p className="empty">Loading</p>}
        {result && !result.ok && (
          <p role="alert" className="notice">
            {FAILURE_MESSAGES[result.reason]}
          </p>
        )}
        {item && (
          <>
            <div className="detail-head">
              {item.primaryImageTag && (
                <img
                  src={imageUrl(
                    session,
                    item.id,
                    item.primaryImageTag,
                    540,
                    getDeviceId(),
                    DEVICE_NAME,
                  )}
                  alt=""
                  className={`detail-poster poster-art--${posterShape(item)}`}
                />
              )}
              <div className="detail-text">
                {subtitle !== undefined && <p className="detail-subtitle">{subtitle}</p>}
                <h1 className="detail-title">{item.name}</h1>
                {metaParts(item).length > 0 && (
                  <ul className="detail-meta">
                    {metaParts(item).map((part) => (
                      <li key={part}>{part}</li>
                    ))}
                  </ul>
                )}
                {item.overview && <p className="detail-overview">{item.overview}</p>}
              </div>
            </div>
            {children?.ok === false && (
              <p role="alert" className="notice">
                Couldn't load what's inside this item.
              </p>
            )}
            {children?.ok && children.items.length > 0 && (
              <section className="children">
                <h2 className="section-title">
                  {CHILDREN_TITLES[item.kind] ?? "Contents"}
                  <span className="count">{children.items.length}</span>
                </h2>
                {item.kind === "series" ? (
                  <div className="poster-grid">
                    {children.items.map((child) => (
                      <PosterTile key={child.id} session={session} item={child} onOpen={onOpen} />
                    ))}
                  </div>
                ) : (
                  <ol className="child-list">
                    {children.items.map((child) => {
                      const childNum = childNumber(child);
                      const runtime = formatRuntime(child.runtimeSeconds, child.kind === "track");
                      return (
                        <li key={child.id}>
                          <button className="child-row" onClick={() => onOpen(child.id)}>
                            <span className="child-number">{childNum ?? ""}</span>
                            <span className="child-name">{child.name}</span>
                            {runtime !== undefined && (
                              <span className="child-runtime">{runtime}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </article>
  );
}
