import { useEffect, useState } from "react";
import "./App.css";
import { LoginForm } from "./LoginForm";
import { checkSession, logout } from "@tidepool/core";
import {
  loadSessions,
  removeSession,
  saveSessions,
  sessionKey,
  upsertSession,
  type SavedSessions,
} from "./session";
import { DEVICE_NAME, getDeviceId } from "./device";
import { Libraries } from "./Libraries";

function App() {
  const [store, setStore] = useState<SavedSessions>(loadSessions);
  const active = store.sessions.find((s) => sessionKey(s) === store.active) ?? null;

  useEffect(() => {
    saveSessions(store);
  }, [store]);

  useEffect(() => {
    let ignore = false;
    async function verify() {
      if (!active) return;
      const status = await checkSession(active, getDeviceId(), DEVICE_NAME);
      if (ignore) return;
      if (status === "revoked") {
        const key = sessionKey(active);
        setStore((prev) => removeSession(prev, key));
      }
    }
    void verify();
    return () => {
      ignore = true;
    };
  }, [active]);

  return active ? (
    <>
      <p>
        Logged in as {active.userName} on {active.serverUrl}{" "}
        <button onClick={() => setStore({ ...store, active: null })}>Switch account</button>{" "}
        <button
          onClick={() => {
            void logout(active, getDeviceId(), DEVICE_NAME);
            setStore(removeSession(store, sessionKey(active)));
          }}
        >
          Log Out
        </button>
      </p>
      <Libraries key={sessionKey(active)} session={active} />
    </>
  ) : (
    <>
      {store.sessions.map((s) => (
        <button key={sessionKey(s)} onClick={() => setStore({ ...store, active: sessionKey(s) })}>
          {s.userName} @ {s.serverUrl}
        </button>
      ))}
      <LoginForm onLogin={(s) => setStore(upsertSession(store, s))} />
    </>
  );
}

export default App;
