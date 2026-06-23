export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  private constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  // Méthodes statiques (Factories)
  static notFound(resource: string, identifier?: string): AppError {
    const msg = identifier
      ? `${resource} non trouvé(e) : ${identifier}`
      : `${resource} non trouvé(e)`;
    return new AppError(msg, 404, "NOT_FOUND");
  }

  static validation(
    message: string,
    details?: Record<string, unknown>
  ): AppError {
    return new AppError(message, 400, "VALIDATION_ERROR", details);
  }

  static unauthorized(message: string = "Non authentifié"): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message: string = "Accès interdit"): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, "CONFLICT");
  }
}
