const FALLBACK_PUBLIC_URL = "http://localhost:3000";

export function getPublicSiteUrl() {
  return (process.env.APP_URL ?? FALLBACK_PUBLIC_URL).replace(/\/+$/, "");
}

export function absolutePublicUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, getPublicSiteUrl()).toString();
}

export function compactText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function truncateText(value: string | null | undefined, maxLength = 160) {
  const text = compactText(value);
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
