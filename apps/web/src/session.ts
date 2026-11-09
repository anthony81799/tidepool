import type { Session } from "@tidepool/core";

function isSession(value: unknown): value is Session {
  if (!(typeof value === "object" && value !== null)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.serverUrl === "string" &&
    typeof record.serverId === "string" &&
    typeof record.userId === "string" &&
    typeof record.userName === "string" &&
    typeof record.accessToken === "string"
  );
}

export function loadSession(): Session | null {
  const value = localStorage.getItem("tidepool.session");
  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value);
    if (isSession(session)) {
      return session;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveSession(session: Session): void {
  localStorage.setItem("tidepool.session", JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem("tidepool.session");
}
