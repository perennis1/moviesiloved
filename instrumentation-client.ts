import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    debug: process.env.NODE_ENV !== "production",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
