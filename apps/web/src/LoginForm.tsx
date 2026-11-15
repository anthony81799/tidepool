import { useState, useEffect, useEffectEvent } from "react";
import {
  login,
  startQuickConnect,
  checkQuickConnect,
  completeQuickConnect,
  type LoginFailure,
  type Session,
} from "@tidepool/core";
import { DEVICE_NAME, getDeviceId } from "./device";

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [quickConnect, setQuickConnect] = useState<{
    url: string;
    code: string;
    secret: string;
  } | null>(null);
  const [expired, setExpired] = useState(false);
  const handleLogin = useEffectEvent((session: Session) => onLogin(session));

  useEffect(() => {
    let ignore = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (!quickConnect) return;
      const status = await checkQuickConnect({
        url: quickConnect.url,
        secret: quickConnect.secret,
        deviceId: getDeviceId(),
        deviceName: DEVICE_NAME,
      });
      if (ignore) return;
      if (status === "pending") {
        timerId = setTimeout(() => void poll(), 3000);
      } else if (status === "approved") {
        const result = await completeQuickConnect({
          url: quickConnect.url,
          secret: quickConnect.secret,
          deviceId: getDeviceId(),
          deviceName: DEVICE_NAME,
        });
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- cleanup sets ignore during the await
        if (ignore) return;
        if (result.ok) {
          handleLogin(result.session);
        } else {
          setFailure(result);
          setQuickConnect(null);
        }
      } else {
        setQuickConnect(null);
        setExpired(true);
      }
    }
    timerId = setTimeout(() => void poll(), 3000);
    return () => {
      ignore = true;
      clearTimeout(timerId);
    };
  }, [quickConnect]);

  return (
    <>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await login({
            url: field(form, "url"),
            username: field(form, "username"),
            password: field(form, "password"),
            deviceId: getDeviceId(),
            deviceName: DEVICE_NAME,
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
            const url = field(form, "url");
            setExpired(false);
            setFailure(null);
            const result = await startQuickConnect({
              url,
              deviceId: getDeviceId(),
              deviceName: DEVICE_NAME,
            });
            if (result.ok) {
              setQuickConnect({ url, code: result.code, secret: result.secret });
            } else {
              setFailure(result);
            }
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
