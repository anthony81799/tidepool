import { type Api, Jellyfin } from "@jellyfin/sdk";
import { getAuthenticationApi } from "@jellyfin/sdk/lib/utils/api/authentication-api";
import type { AuthenticationResult } from "@jellyfin/sdk/lib/generated-client";
import { isAxiosError } from "axios";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
export * from "./items";

export type Session = {
  serverUrl: string;
  serverId: string;
  userId: string;
  userName: string;
  accessToken: string;
};

export type SessionStatus = "valid" | "revoked" | "unknown";

type LoginOptions = {
  url: string;
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
};

export type LoginFailure = {
  ok: false;
  reason: "invalid-credentials" | "unreachable" | "server-error" | "invalid-response";
};

export type LoginResult = { ok: true; session: Session } | LoginFailure;

type ServerOptions = Omit<LoginOptions, "username" | "password">;

function toLoginFailure(err: unknown): LoginFailure {
  if (!isAxiosError(err)) throw err;

  let reason: LoginFailure["reason"];
  if (!err.response) {
    reason = "unreachable";
  } else if (err.response?.status === 401) {
    reason = "invalid-credentials";
  } else {
    reason = "server-error";
  }

  return {
    ok: false,
    reason,
  };
}

function toSession(url: string, data: AuthenticationResult): LoginResult {
  if (!data.ServerId || !data.User || !data.User.Id || !data.User.Name || !data.AccessToken)
    return { ok: false, reason: "invalid-response" };
  return {
    ok: true,
    session: {
      serverUrl: url,
      serverId: data.ServerId,
      userId: data.User.Id,
      userName: data.User.Name,
      accessToken: data.AccessToken,
    },
  };
}

export async function login({
  url,
  username,
  password,
  deviceId,
  deviceName,
}: LoginOptions): Promise<LoginResult> {
  const api = createApi(url, deviceId, deviceName);
  try {
    const data = (
      await getAuthenticationApi(api).authenticateUserByName({
        authenticateUserByName: { Username: username, Pw: password },
      })
    ).data;
    return toSession(url, data);
  } catch (err) {
    return toLoginFailure(err);
  }
}

function createApi(url: string, deviceId: string, deviceName: string, accessToken?: string): Api {
  const instanceParams = {
    clientInfo: { name: "Tidepool", version: "0.1" },
    deviceInfo: { id: deviceId, name: deviceName },
  };
  const jellyfin = new Jellyfin(instanceParams);
  return jellyfin.createApi(url, accessToken);
}

export async function checkSession(
  session: Session,
  deviceId: string,
  deviceName: string,
): Promise<SessionStatus> {
  const api = createApi(session.serverUrl, deviceId, deviceName, session.accessToken);
  try {
    await getUserApi(api).getCurrentUser();
    return "valid";
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    if (err.response?.status === 401) return "revoked";
    return "unknown";
  }
}

export async function startQuickConnect({
  url,
  deviceId,
  deviceName,
}: ServerOptions): Promise<{ ok: true; code: string; secret: string } | LoginFailure> {
  const api = createApi(url, deviceId, deviceName);
  try {
    const data = (await getAuthenticationApi(api).initiateQuickConnect()).data;
    if (!data.Code || !data.Secret) return { ok: false, reason: "invalid-response" };
    return { ok: true, code: data.Code, secret: data.Secret };
  } catch (err) {
    return toLoginFailure(err);
  }
}

export async function checkQuickConnect({
  url,
  secret,
  deviceId,
  deviceName,
}: ServerOptions & { secret: string }): Promise<"pending" | "approved" | "expired"> {
  const api = createApi(url, deviceId, deviceName);
  try {
    const data = (await getAuthenticationApi(api).getQuickConnectState({ secret })).data;
    if (!data.Authenticated) return "pending";
    return "approved";
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    if (!err.response) return "pending";
    else if (err.response.status === 404) return "expired";
    return "pending";
  }
}

export async function completeQuickConnect({
  url,
  secret,
  deviceId,
  deviceName,
}: ServerOptions & { secret: string }): Promise<LoginResult> {
  const api = createApi(url, deviceId, deviceName);
  try {
    const data = (
      await getAuthenticationApi(api).authenticateWithQuickConnect({
        quickConnectDto: { Secret: secret },
      })
    ).data;
    return toSession(url, data);
  } catch (err) {
    return toLoginFailure(err);
  }
}
