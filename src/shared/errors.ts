export type CaptureErrorCode =
  | 'RESTRICTED_PAGE'
  | 'USER_CANCELLED'
  | 'TAB_CLOSED'
  | 'CANVAS_LIMIT'
  | 'CAPTURE_RATE_LIMIT'
  | 'INVALID_MESSAGE'
  | 'UNKNOWN';

export class CaptureError extends Error {
  public readonly code: CaptureErrorCode;

  public constructor(code: CaptureErrorCode, message: string) {
    super(message);
    this.name = 'CaptureError';
    this.code = code;
  }
}
