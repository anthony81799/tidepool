import { useState, useEffect, useEffectEvent } from "react";
import {
  login,
  startQuickConnect,
  checkQuickConnect,
  completeQuickConnect,
  findServer,
  type LoginFailure,
  type Session,
} from "@tidepool/core";
import { DEVICE_NAME, getDeviceId } from "./device";

const FAILURE_MESSAGES: Record<LoginFailure["reason"], string> = {
  "invalid-credentials": "Wrong username or password",
  "quick-connect-disabled": "Quick Connect is turned off on this server",
  unreachable: "Couldn't reach the server",
  "server-error": "The server returned an error",
  "invalid-response": "The server sent an unexpected response",
};

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
        className="login-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setExpired(false);
          setFailure(null);
          const form = new FormData(event.currentTarget);
          const server = await findServer({
            url: field(form, "url"),
            deviceId: getDeviceId(),
            deviceName: DEVICE_NAME,
          });
          if (!server.ok) {
            setFailure(server);
            return;
          }
          const result = await login({
            url: server.url,
            username: field(form, "username"),
            password: field(form, "password"),
            deviceId: getDeviceId(),
            deviceName: DEVICE_NAME,
          });
          if (result.ok) onLogin(result.session);
          else setFailure(result);
        }}
      >
        <label>
          Server
          <input name="url" defaultValue="http://127.0.0.1:8096" />
        </label>
        <label>
          Username
          <input name="username" autoComplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" />
        </label>
        <button type="submit">Log in</button>
        <button
          type="button"
          onClick={async (event) => {
            if (!event.currentTarget.form) return;
            setExpired(false);
            setFailure(null);
            const form = new FormData(event.currentTarget.form);
            const server = await findServer({
              url: field(form, "url"),
              deviceId: getDeviceId(),
              deviceName: DEVICE_NAME,
            });
            if (!server.ok) {
              setFailure(server);
              return;
            }
            const result = await startQuickConnect({
              url: server.url,
              deviceId: getDeviceId(),
              deviceName: DEVICE_NAME,
            });
            if (result.ok) {
              setQuickConnect({ url: server.url, code: result.code, secret: result.secret });
            } else {
              setFailure(result);
            }
          }}
        >
          Use Quick Connect
        </button>
      </form>
      {quickConnect && <p>Enter this code in another Jellyfin app: {quickConnect.code}</p>}
      {expired && <p role="alert">This code has expired</p>}
      {failure && <p role="alert">{FAILURE_MESSAGES[failure.reason]}</p>}
    </>
  );
}
