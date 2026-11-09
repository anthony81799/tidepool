import { useState } from "react";
import "./App.css";
import { LoginForm } from "./LoginForm";
import type { Session } from "@tidepool/core";
import { clearSession, loadSession, saveSession } from "./session";

function App() {
  const [session, setSession] = useState<Session | null>(loadSession);

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
