import { type Api, Jellyfin } from "@jellyfin/sdk";

export type Session = {
  serverUrl: string;
  serverId: string;
  userId: string;
  userName: string;
  accessToken: string;
};

export type SessionStatus = "valid" | "revoked" | "unknown";

export function createJellyfin(deviceId: string, deviceName: string): Jellyfin {
  const instanceParams = {
    clientInfo: { name: "Tidepool", version: "0.1" },
    deviceInfo: { id: deviceId, name: deviceName },
  };
  return new Jellyfin(instanceParams);
}

export function createApi(
  url: string,
  deviceId: string,
  deviceName: string,
  accessToken?: string,
): Api {
  const jellyfin = createJellyfin(deviceId, deviceName);
  return jellyfin.createApi(url, accessToken);
}
