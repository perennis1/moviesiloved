import { headers } from "next/headers";

export function getBaseUrl() {
  const headerList = headers();
  const host = headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto");

  if (host) {
    return `${forwardedProto ?? "http"}://${host}`;
  }

  return process.env.APP_URL ?? "http://localhost:3000";
}
