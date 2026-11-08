import { Jellyfin } from "@jellyfin/sdk";
import { getAuthenticationApi } from "@jellyfin/sdk/lib/utils/api/authentication-api";

export type Session = {
  serverUrl: string;
  serverId: string;
  userId: string;
  userName: string;
  accessToken: string;
};

export async function login(url: string, username: string, password: string): Promise<Session> {
  const instanceParams = {
    clientInfo: { name: "Tidepool", version: "0.1" },
    deviceInfo: { id: "1234", name: "test" },
  };
  const jellyfin = new Jellyfin(instanceParams);
  const api = jellyfin.createApi(url);
  const data = (
    await getAuthenticationApi(api).authenticateUserByName({
      authenticateUserByName: { Username: username, Pw: password },
    })
  ).data;
  if (!data.ServerId) throw new Error("Must have a server ID");
  if (!data.User) throw new Error("Must have a user");
  if (!data.User.Id) throw new Error("Must have a user id");
  if (!data.User.Name) throw new Error("Must have a user name");
  if (!data.AccessToken) throw new Error("Must have an access token");

  return {
    serverUrl: url,
    serverId: data.ServerId,
    userId: data.User.Id,
    userName: data.User.Name,
    accessToken: data.AccessToken,
  };
}
