export function isPrismaMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (code === "P2021") {
    return true;
  }

  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.includes("does not exist in the current database");
}
