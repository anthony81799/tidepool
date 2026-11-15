import { imageUrl, type Item, type Session } from "@tidepool/core";
import { DEVICE_NAME, getDeviceId } from "./device";

type Props = { session: Session; item: Item; onOpen: (id: string) => void };

export function PosterTile({ session, item, onOpen }: Props) {
  return (
    <button className="poster-tile" onClick={() => onOpen(item.id)}>
      {item.primaryImageTag && (
        <img
          src={imageUrl(session, item.id, item.primaryImageTag, 300, getDeviceId(), DEVICE_NAME)}
          alt=""
          loading="lazy"
        />
      )}
      <span>{item.name}</span>
    </button>
  );
}
