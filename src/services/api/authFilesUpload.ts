export type AuthFilesUploadFailure = {
  name: string;
  message: string;
};

export type AuthFilesUploadResult = {
  uploaded: number;
  files: string[];
  failed: AuthFilesUploadFailure[];
  partial: boolean;
};

export type AuthFilesUploadProgress = {
  loaded: number;
  total: number | null;
  percent: number | null;
};

export type AuthFilesUploadProgressHandler = (progress: AuthFilesUploadProgress) => void;

type UploadProgressEventLike = {
  loaded?: number;
  total?: number | null;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const toStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
};

const normalizeFailure = (value: unknown): AuthFilesUploadFailure | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const name = String(record.name ?? '').trim();
  const message = String(record.error ?? record.message ?? '').trim();
  if (!name && !message) return null;
  return {
    name,
    message: message || 'Unknown error',
  };
};

export const buildAuthFilesUploadFormData = (files: File[]): FormData => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file, file.name);
  });
  return formData;
};

export const normalizeAuthFilesUploadResponse = (
  payload: unknown,
  fallbackTotal: number
): AuthFilesUploadResult => {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const files = toStringList(record.files);
  const failed = Array.isArray(record.failed)
    ? record.failed
        .map(normalizeFailure)
        .filter((item): item is AuthFilesUploadFailure => item !== null)
    : [];
  const uploadedValue = toFiniteNumber(record.uploaded);
  const uploaded =
    uploadedValue !== null
      ? Math.max(0, Math.trunc(uploadedValue))
      : files.length > 0
        ? files.length
        : failed.length === 0
          ? Math.max(0, fallbackTotal)
          : 0;
  const status = String(record.status ?? '')
    .trim()
    .toLowerCase();

  return {
    uploaded,
    files,
    failed,
    partial: status === 'partial' || failed.length > 0,
  };
};

export const toAuthFilesUploadProgress = (
  event: UploadProgressEventLike
): AuthFilesUploadProgress => {
  const loaded = Math.max(0, Math.trunc(toFiniteNumber(event.loaded) ?? 0));
  const totalValue = toFiniteNumber(event.total);
  const total = totalValue !== null && totalValue > 0 ? Math.trunc(totalValue) : null;
  const percent =
    total === null ? null : Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));

  return { loaded, total, percent };
};
