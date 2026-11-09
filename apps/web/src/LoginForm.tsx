import { useState } from "react";
import { login } from "@tidepool/core";
import type { LoginResult } from "@tidepool/core";
import { getDeviceId } from "./device";

export function LoginForm() {
  const [result, setResult] = useState<LoginResult | null>(null);

  return (
    <>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setResult(
            await login({
              url: String(form.get("url")),
              username: String(form.get("username")),
              password: String(form.get("password")),
              deviceId: getDeviceId(),
              deviceName: "Tidepool Web",
            }),
          );
        }}
      >
        <input name="url" defaultValue="http://127.0.0.1:8096" />
        <input name="username" />
        <input name="password" type="password" />
        <button type="submit">Log in</button>
      </form>
      {result?.ok && <p>Logged in as {result.session.userName}</p>}
      {result && !result.ok && <p>{result.reason}</p>}
    </>
  );
}
