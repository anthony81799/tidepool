import { useEffect, useState } from "react";
import "./App.css";
import { LoginForm } from "./LoginForm";
import { checkSession, type Session } from "@tidepool/core";
import { clearSession, loadSession, saveSession } from "./session";
import { getDeviceId } from "./device";

function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  useEffect(() => {
    let ignore = false;
    async function verify() {
      if (!session) return;
      const status = await checkSession(session, getDeviceId(), "Tidepool Web");
      if (!ignore) {
        if (status === "revoked") {
          clearSession();
          setSession(null);
        }
      }
    }
    verify();
    return () => {
      ignore = true;
    };
  }, [session]);

  return (
    <>
      {session && (
        <p>
          Logged in as {session.userName}{" "}
          <button
            onClick={() => {
              clearSession();
              setSession(null);
            }}
          >
            Log Out
          </button>
        </p>
      )}
      {!session && (
        <LoginForm
          onLogin={(s) => {
            saveSession(s);
            setSession(s);
          }}
        />
      )}
    </>
  );
}

export default App;
