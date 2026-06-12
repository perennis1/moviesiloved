import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default(""),
  PORT: z.string().default("3000"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().default(""),
  CLERK_PUBLISHABLE_KEY: z.string().default(""),
  CLERK_SECRET_KEY: z.string().default(""),
  CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  CLERK_ADMIN_USER_IDS: z.string().default(""),
  AD_ALLOWED_HOSTS: z.string().default(""),
  UPLOADS_DIR: z.string().default("public/uploads"),
  UPLOADS_PUBLIC_URL: z.string().default("/uploads"),
  MAX_UPLOAD_BYTES: z.string().default("5242880"),
  MEDIA_STORAGE_BUCKET: z.string().default(""),
  MEDIA_STORAGE_REGION: z.string().default("auto"),
  MEDIA_STORAGE_ENDPOINT: z.string().default(""),
  MEDIA_STORAGE_ACCESS_KEY_ID: z.string().default(""),
  MEDIA_STORAGE_SECRET_ACCESS_KEY: z.string().default(""),
  MEDIA_PUBLIC_BASE_URL: z.string().default(""),
  MEDIA_STORAGE_PREFIX: z.string().default("media"),
  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().default(""),
  SENTRY_ENVIRONMENT: z.string().default("")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join(" ");
  throw new Error(`Environment configuration is invalid. ${issues}`);
}

export const env = parsed.data;
