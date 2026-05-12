export class SheetsError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'SheetsError';
  }
}

export class NetworkError extends SheetsError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

export class ParseError extends SheetsError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'PARSE_ERROR', originalError);
    this.name = 'ParseError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof SheetsError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Неизвестная ошибка';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError ||
    (error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    ));
}
