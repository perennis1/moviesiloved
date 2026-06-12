export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function assert(condition: unknown, message: string, statusCode = 400): asserts condition {
  if (!condition) {
    throw new AppError(message, statusCode);
  }
}
