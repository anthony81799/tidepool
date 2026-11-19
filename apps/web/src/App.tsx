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
import { hostOf } from "./format";
import { Mark } from "./Icons";
import { Libraries } from "./Libraries";

function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

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

  if (active) {
    return (
      <Libraries
        key={sessionKey(active)}
        session={active}
        account={
          <>
            <div className="account">
              <Avatar name={active.userName} />
              <span className="account-text">
                <span className="account-name">{active.userName}</span>
                <span className="account-server">{hostOf(active.serverUrl)}</span>
              </span>
            </div>
            <div className="account-actions">
              <button
                className="button-ghost button-small"
                onClick={() => setStore({ ...store, active: null })}
              >
                Switch account
              </button>
              <button
                className="button-ghost button-small"
                onClick={() => {
                  void logout(active, getDeviceId(), DEVICE_NAME);
                  setStore(removeSession(store, sessionKey(active)));
                }}
              >
                Log out
              </button>
            </div>
          </>
        }
      />
    );
  }

  return (
    <div className="welcome">
      <div className="welcome-brand">
        <Mark size={56} />
        <h1 className="wordmark">Tidepool</h1>
        <p className="welcome-tagline">Your Jellyfin movies, shows, music and books.</p>
      </div>
      <div className="welcome-panel">
        {store.sessions.length > 0 && (
          <section className="saved-accounts">
            <h2 className="section-title">Continue as</h2>
            <ul>
              {store.sessions.map((s) => (
                <li key={sessionKey(s)}>
                  <button
                    className="account-row"
                    onClick={() => setStore({ ...store, active: sessionKey(s) })}
                  >
                    <Avatar name={s.userName} />
                    <span className="account-text">
                      <span className="account-name">{s.userName}</span>
                      <span className="account-server">{hostOf(s.serverUrl)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="section-title">
            {store.sessions.length > 0 ? "Add an account" : "Log in to your server"}
          </h2>
          <LoginForm onLogin={(s) => setStore(upsertSession(store, s))} />
        </section>
      </div>
    </div>
  );
}

export default App;
