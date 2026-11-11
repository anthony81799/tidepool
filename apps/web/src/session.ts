import type { Session } from "@tidepool/core";

export type SavedSessions = { active: string | null; sessions: Session[] };

export function sessionKey(s: Session): string {
  return `${s.serverId}/${s.userId}`;
}

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

export function loadSessions(): SavedSessions {
  localStorage.removeItem("tidepool.session");
  const value = localStorage.getItem("tidepool.sessions");
  if (!value) {
    return { active: null, sessions: [] };
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!(typeof parsed === "object" && parsed !== null)) return { active: null, sessions: [] };
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.sessions)) return { active: null, sessions: [] };
    return {
      active: typeof record.active === "string" ? record.active : null,
      sessions: record.sessions.filter(isSession),
    };
  } catch {
    return { active: null, sessions: [] };
  }
}

export function saveSessions(savedSessions: SavedSessions): void {
  localStorage.setItem("tidepool.sessions", JSON.stringify(savedSessions));
}

export function upsertSession(store: SavedSessions, session: Session): SavedSessions {
  const key = sessionKey(session);
  if (store.sessions.some((s) => sessionKey(s) === key)) {
    const sessions = store.sessions.map((s) => {
      if (sessionKey(s) === key) return session;
      return s;
    });
    return { active: key, sessions };
  }
  return { active: key, sessions: [...store.sessions, session] };
}

export function removeSession(store: SavedSessions, key: string): SavedSessions {
  return {
    active: store.active === key ? null : store.active,
    sessions: store.sessions.filter((s) => sessionKey(s) !== key),
  };
}
