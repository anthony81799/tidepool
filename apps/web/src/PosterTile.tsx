import { imageUrl, type Item, type Session } from "@tidepool/core";
import { DEVICE_NAME, getDeviceId } from "./device";
import { itemSubtitle, posterShape } from "./format";

type Props = { session: Session; item: Item; onOpen: (id: string) => void };

export function PosterTile({ session, item, onOpen }: Props) {
  const subtitle = itemSubtitle(item);
  return (
    <button className="poster-tile" onClick={() => onOpen(item.id)}>
      <span className={`poster-art poster-art--${posterShape(item)}`}>
        {item.primaryImageTag ? (
          <img
            src={imageUrl(session, item.id, item.primaryImageTag, 360, getDeviceId(), DEVICE_NAME)}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="poster-fallback" aria-hidden="true">
            {item.name.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="poster-title">{item.name}</span>
      {subtitle !== undefined && <span className="poster-subtitle">{subtitle}</span>}
    </button>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="poster-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="poster-tile poster-tile--skeleton">
          <span className="poster-art poster-art--tall" />
          <span className="skeleton-line" />
        </span>
      ))}
    </div>
  );
}
