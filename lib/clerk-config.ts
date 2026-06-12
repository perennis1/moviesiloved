export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";

  return isRealClerkKey(publishableKey, "pk_") && isRealClerkKey(secretKey, "sk_");
}

function isRealClerkKey(value: string, prefix: string) {
  return value.startsWith(prefix) && !value.includes("replace_me");
}
