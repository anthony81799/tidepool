import { useState } from "react";
import { login } from "@tidepool/core";
import type { LoginFailure, Session } from "@tidepool/core";
import { getDeviceId } from "./device";

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [failure, setFailure] = useState<LoginFailure | null>(null);

  return (
    <>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await login({
            url: String(form.get("url")),
            username: String(form.get("username")),
            password: String(form.get("password")),
            deviceId: getDeviceId(),
            deviceName: "Tidepool Web",
          });
          if (result.ok) onLogin(result.session);
          else setFailure(result);
        }}
      >
        <input name="url" defaultValue="http://127.0.0.1:8096" />
        <input name="username" />
        <input name="password" type="password" />
        <button type="submit">Log in</button>
      </form>
      {failure && <p>{failure.reason}</p>}
    </>
  );
}
