import { useEffect, useState } from "react";
import "./App.css";
import { LoginForm } from "./LoginForm";
import { checkSession } from "@tidepool/core";
import {
  loadSessions,
  removeSession,
  saveSessions,
  sessionKey,
  upsertSession,
  type SavedSessions,
} from "./session";
import { getDeviceId } from "./device";

function App() {
  const [store, setStore] = useState<SavedSessions>(loadSessions);
  const active = store.sessions.find((s) => sessionKey(s) === store.active) ?? null;

  function update(next: SavedSessions): void {
    saveSessions(next);
    setStore(next);
  }

  useEffect(() => {
    let ignore = false;
    async function verify() {
      if (!active) return;
      const status = await checkSession(active, getDeviceId(), "Tidepool Web");
      if (!ignore) {
        if (status === "revoked") {
          const key = sessionKey(active);
          setStore((prev) => {
            const next = removeSession(prev, key);
            saveSessions(next);
            return next;
          });
        }
      }
    }
    verify();
    return () => {
      ignore = true;
    };
  }, [active]);

  return (
    <>
      {active && (
        <p>
          Logged in as {active.userName} on {active.serverUrl}{" "}
          <button onClick={() => update({ ...store, active: null })}>Switch account</button>{" "}
          <button onClick={() => update(removeSession(store, sessionKey(active)))}>Log Out</button>
        </p>
      )}
      {!active && (
        <>
          {store.sessions.map((s) => (
            <button key={sessionKey(s)} onClick={() => update({ ...store, active: sessionKey(s) })}>
              {s.userName} @ {s.serverUrl}
            </button>
          ))}
          <LoginForm onLogin={(s) => update(upsertSession(store, s))} />
        </>
      )}
    </>
  );
}

export default App;
