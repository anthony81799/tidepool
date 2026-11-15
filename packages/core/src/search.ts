import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { isAxiosError } from "axios";
import { createApi, type Session } from "./api";
import { MAPPED_ITEM_TYPES, toItem, type Item, type ItemKind } from "./items";
import type { ItemsResult } from "./library";

type ItemOf<K extends ItemKind> = Extract<Item, { kind: K }>;

export type ItemsByKind = { [K in ItemKind]?: ItemOf<K>[] };

export async function searchItems(
  session: Session,
  term: string,
  deviceId: string,
  deviceName: string,
): Promise<ItemsResult> {
  const searchTerm = term.trim();
  if (searchTerm.length === 0) return { ok: true, items: [] };
  try {
    const data = (
      await getLibraryApi(
        createApi(session.serverUrl, deviceId, deviceName, session.accessToken),
      ).getItems({
        userId: session.userId,
        searchTerm,
        recursive: true,
        includeItemTypes: MAPPED_ITEM_TYPES,
        fields: ["Path"],
        limit: 100,
      })
    ).data;
    return { ok: true, items: (data.Items ?? []).flatMap((dto) => toItem(dto) ?? []) };
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return { ok: false, reason: "failed" };
  }
}

function add<K extends ItemKind>(
  groups: { [P in K]?: ItemOf<P>[] },
  kind: K,
  item: ItemOf<NoInfer<K>>,
): void {
  (groups[kind] ??= []).push(item);
}

export function groupByKind(items: Item[]): ItemsByKind {
  return items.reduce<ItemsByKind>((groups, item) => {
    add(groups, item.kind, item);
    return groups;
  }, {});
}
