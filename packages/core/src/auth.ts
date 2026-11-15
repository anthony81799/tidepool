import { getAuthenticationApi } from "@jellyfin/sdk/lib/utils/api/authentication-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import type { AuthenticationResult } from "@jellyfin/sdk/lib/generated-client";
import { isAxiosError } from "axios";
import { createApi, type Session, type SessionStatus } from "./api";

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
  if (!err.response) return { ok: false, reason: "unreachable" };
  if (err.response.status === 401) return { ok: false, reason: "invalid-credentials" };
  return { ok: false, reason: "server-error" };
}

function toSession(url: string, data: AuthenticationResult): LoginResult {
  if (!data.ServerId || !data.User || !data.User.Id || !data.User.Name || !data.AccessToken) {
    return { ok: false, reason: "invalid-response" };
  }
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
    return data.Authenticated ? "approved" : "pending";
  } catch (err) {
    if (!isAxiosError(err)) throw err;
    return err.response?.status === 404 ? "expired" : "pending";
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
