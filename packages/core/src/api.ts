import { type Api, Jellyfin } from "@jellyfin/sdk";

export type Session = {
  serverUrl: string;
  serverId: string;
  userId: string;
  userName: string;
  accessToken: string;
};

export type SessionStatus = "valid" | "revoked" | "unknown";

export function createApi(
  url: string,
  deviceId: string,
  deviceName: string,
  accessToken?: string,
): Api {
  const instanceParams = {
    clientInfo: { name: "Tidepool", version: "0.1" },
    deviceInfo: { id: deviceId, name: deviceName },
  };
  const jellyfin = new Jellyfin(instanceParams);
  return jellyfin.createApi(url, accessToken);
}
