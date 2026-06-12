"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#111214", color: "#fff", fontFamily: "sans-serif", padding: "24px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Something went wrong</h1>
        <p style={{ maxWidth: "720px", lineHeight: 1.6, color: "#cbd5e1" }}>
          The app hit an unexpected error. The incident has been reported to Sentry if the DSN is configured.
        </p>
      </body>
    </html>
  );
}
