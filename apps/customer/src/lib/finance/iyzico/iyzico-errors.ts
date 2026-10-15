export type IyzicoErrorKind = 'configuration'|'validation'|'transport'|'unknown';

export class IyzicoError extends Error {
  constructor(
    readonly code: string,
    readonly kind: IyzicoErrorKind,
    readonly retryable: boolean,
    message: string,
    options?: {cause?: unknown},
  ) {
    super(message, options);
    this.name = 'IyzicoError';
  }
}

export function isUnknownIyzicoResult(error: unknown): boolean {
  return error instanceof IyzicoError && error.kind === 'unknown';
}
