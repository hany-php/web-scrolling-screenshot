export const MAX_CHUNK_HEIGHT_PX = 16_384;
export const MAX_CHUNK_AREA_PX = 200_000_000;
export const CAPTURE_MIN_INTERVAL_MS = 550;
export const LAZY_SETTLE_DELAY_MS = 120;
export const DEFAULT_JPEG_QUALITY = 0.92;
export const DEFAULT_WEBP_QUALITY = 0.92;

export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type CaptureMode = 'full' | 'region';
