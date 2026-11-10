import { useState, useEffect } from "react";
import {
  login,
  startQuickConnect,
  checkQuickConnect,
  completeQuickConnect,
  type LoginFailure,
  type Session,
} from "@tidepool/core";
import { getDeviceId } from "./device";

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [quickConnect, setQuickConnect] = useState<{
    url: string;
    code: string;
    secret: string;
  } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let ignore = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (!quickConnect) return;
      const status = await checkQuickConnect({
        url: quickConnect.url,
        secret: quickConnect.secret,
        deviceId: getDeviceId(),
        deviceName: "Tidepool Web",
      });
      if (ignore) return;
      if (status === "pending") timerId = setTimeout(poll, 3000);
      else if (status === "approved") {
        const result = await completeQuickConnect({
          url: quickConnect.url,
          secret: quickConnect.secret,
          deviceId: getDeviceId(),
          deviceName: "Tidepool Web",
        });
        if (ignore) return;
        if (result.ok) onLogin(result.session);
        else {
          setFailure(result);
          setQuickConnect(null);
        }
      } else {
        setQuickConnect(null);
        setExpired(true);
      }
    }
    timerId = setTimeout(poll, 3000);
    return () => {
      ignore = true;
      clearTimeout(timerId);
    };
  }, [quickConnect, onLogin]);

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
        <button
          type="button"
          onClick={async (event) => {
            if (!event.currentTarget.form) return;
            const form = new FormData(event.currentTarget.form);
            const url = String(form.get("url"));
            setExpired(false);
            setFailure(null);
            const result = await startQuickConnect({
              url,
              deviceId: getDeviceId(),
              deviceName: "Tidepool Web",
            });
            if (result.ok) {
              setQuickConnect({ url, code: result.code, secret: result.secret });
            } else setFailure(result);
          }}
        >
          Use Quick Connect
        </button>
      </form>
      {quickConnect && <p>Enter this code in another Jellyfin app: {quickConnect.code}</p>}
      {expired && <p>This code has expired</p>}
      {failure && <p>{failure.reason}</p>}
    </>
  );
}
