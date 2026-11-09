export function getDeviceId(): string {
  let deviceId = localStorage.getItem("tidepool.deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("tidepool.deviceId", deviceId);
  }

  return deviceId;
}
