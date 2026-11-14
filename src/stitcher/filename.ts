import type { ExportFormat } from '../shared/constants';

export interface FilenameOptions {
  readonly hostname: string;
  readonly date?: Date;
  readonly partIndex?: number;
  readonly totalParts?: number;
  readonly format: ExportFormat;
}

export function sanitizeHostnameSlug(hostname: string): string {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/\./g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return normalized.length > 0 ? normalized : 'capture';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatTimestamp(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

export function formatScreenshotFilename(options: FilenameOptions): string {
  const slug = sanitizeHostnameSlug(options.hostname);
  const stamp = formatTimestamp(options.date ?? new Date());
  const ext = options.format === 'jpeg' ? 'jpg' : options.format;

  const totalParts = options.totalParts ?? 1;
  const partIndex = options.partIndex ?? 0;

  if (totalParts > 1) {
    return `screenshot-${slug}-${stamp}-part-${String(partIndex + 1)}of${String(totalParts)}.${ext}`;
  }

  return `screenshot-${slug}-${stamp}.${ext}`;
}
