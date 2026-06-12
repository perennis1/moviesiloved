import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: true,
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

const sentryBuildOptions = process.env.SENTRY_AUTH_TOKEN
  ? {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      telemetry: false,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true
      }
    }
  : {
      silent: true,
      telemetry: false
    };

export default withSentryConfig(nextConfig, sentryBuildOptions);
