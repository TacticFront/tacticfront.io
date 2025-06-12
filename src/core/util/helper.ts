// src/core/util/helper.ts

export function isLocalhost(): boolean {
  const { hostname, host } = window.location;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    host.startsWith("localhost:") ||
    hostname.endsWith(".localhost")
  );
}
