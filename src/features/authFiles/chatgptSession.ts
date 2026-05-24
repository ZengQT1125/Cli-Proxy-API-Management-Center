type JsonRecord = Record<string, unknown>;

export type ChatGptSessionConversionOptions = {
  now?: Date;
};

export type ChatGptSessionCpaFile = {
  fileName: string;
  content: string;
  json: JsonRecord;
};

const isPlainObject = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readRecord = (record: JsonRecord, key: string): JsonRecord | undefined => {
  const value = record[key];
  return isPlainObject(value) ? value : undefined;
};

const firstNonEmpty = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const encodeBase64UrlJson = (value: JsonRecord): string =>
  bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));

const parseJwtPayload = (token: string | undefined): JsonRecord | undefined => {
  if (!token) return undefined;
  const [, payload] = token.split('.');
  if (!payload) return undefined;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as unknown;
    return isPlainObject(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
};

const getOpenAISection = (payload: JsonRecord | undefined, key: string): JsonRecord => {
  const value = payload?.[key];
  return isPlainObject(value) ? value : {};
};

const normalizeTimestamp = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value > 1e11 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const timestampFromUnixSeconds = (value: unknown): string | undefined => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  const date = new Date(Math.trunc(numeric) * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const epochSecondsFromValue = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.trunc(numeric > 1e11 ? numeric / 1000 : numeric);
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.trunc(parsed / 1000) : 0;
};

const buildSyntheticCodexIdToken = ({
  email,
  accountId,
  planType,
  userId,
  expiresAt,
  now,
}: {
  email?: string;
  accountId: string;
  planType?: string;
  userId?: string;
  expiresAt?: string;
  now: Date;
}): string => {
  const issuedAt = Math.trunc(now.getTime() / 1000);
  const authInfo: JsonRecord = { chatgpt_account_id: accountId };
  const expires = epochSecondsFromValue(expiresAt) || issuedAt + 90 * 24 * 60 * 60;

  if (planType) {
    authInfo.chatgpt_plan_type = planType;
  }
  if (userId) {
    authInfo.chatgpt_user_id = userId;
    authInfo.user_id = userId;
  }

  const payload: JsonRecord = {
    iat: issuedAt,
    exp: expires,
    'https://api.openai.com/auth': authInfo,
  };
  if (email) {
    payload.email = email;
  }

  return `${encodeBase64UrlJson({ alg: 'none', typ: 'JWT', cpa_synthetic: true })}.${encodeBase64UrlJson(payload)}.synthetic`;
};

const toFileToken = (value: string | undefined, fallback: string): string =>
  (value || fallback)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80) || fallback;

const stripUnavailable = (record: JsonRecord): JsonRecord =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null)
  );

export const convertChatGptSessionToCpaFile = (
  rawText: string,
  options: ChatGptSessionConversionOptions = {}
): ChatGptSessionCpaFile => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('ChatGPT Session 不是有效 JSON');
  }

  if (!isPlainObject(parsed)) {
    throw new Error('ChatGPT Session 必须是 JSON 对象');
  }

  const record = parsed;
  const tokens = readRecord(record, 'tokens');
  const token = readRecord(record, 'token');
  const credentials = readRecord(record, 'credentials');
  const account = readRecord(record, 'account');
  const user = readRecord(record, 'user');
  const meta = readRecord(record, 'meta');
  const providerSpecificData = readRecord(record, 'providerSpecificData');

  const accessToken = firstNonEmpty(
    record.accessToken,
    record.access_token,
    tokens?.accessToken,
    tokens?.access_token,
    token?.accessToken,
    token?.access_token,
    credentials?.accessToken,
    credentials?.access_token
  );
  if (!accessToken) {
    throw new Error('缺少 accessToken');
  }

  const sessionToken = firstNonEmpty(
    record.sessionToken,
    record.session_token,
    tokens?.sessionToken,
    tokens?.session_token,
    token?.sessionToken,
    token?.session_token,
    credentials?.session_token
  );
  const refreshToken = firstNonEmpty(
    record.refreshToken,
    record.refresh_token,
    tokens?.refreshToken,
    tokens?.refresh_token,
    token?.refreshToken,
    token?.refresh_token,
    credentials?.refresh_token
  );
  const inputIdToken = firstNonEmpty(
    record.idToken,
    record.id_token,
    tokens?.idToken,
    tokens?.id_token,
    token?.idToken,
    token?.id_token,
    credentials?.id_token
  );

  const accessPayload = parseJwtPayload(accessToken);
  const idPayload = parseJwtPayload(inputIdToken);
  const auth = getOpenAISection(accessPayload, 'https://api.openai.com/auth');
  const idAuth = getOpenAISection(idPayload, 'https://api.openai.com/auth');
  const profile = getOpenAISection(accessPayload, 'https://api.openai.com/profile');

  const expiresAt = firstNonEmpty(
    timestampFromUnixSeconds(accessPayload?.exp),
    normalizeTimestamp(record.expires),
    normalizeTimestamp(record.expiresAt),
    normalizeTimestamp(record.expired),
    normalizeTimestamp(record.expires_at)
  );
  const email = firstNonEmpty(
    user?.email,
    record.email,
    meta?.label,
    record.label,
    credentials?.email,
    providerSpecificData?.email,
    profile.email,
    idPayload?.email,
    accessPayload?.email
  );
  const accountId = firstNonEmpty(
    account?.id,
    record.account_id,
    tokens?.accountId,
    tokens?.account_id,
    record.chatgptAccountId,
    record.chatgpt_account_id,
    meta?.chatgptAccountId,
    meta?.chatgpt_account_id,
    tokens?.chatgptAccountId,
    tokens?.chatgpt_account_id,
    providerSpecificData?.chatgptAccountId,
    providerSpecificData?.chatgpt_account_id,
    credentials?.chatgpt_account_id,
    auth.chatgpt_account_id,
    idAuth.chatgpt_account_id,
    record.provider === 'codex' ? record.id : undefined
  );
  if (!accountId) {
    throw new Error('缺少 ChatGPT 账号 ID');
  }

  const userId = firstNonEmpty(
    user?.id,
    record.user_id,
    record.chatgptUserId,
    providerSpecificData?.chatgptUserId,
    providerSpecificData?.chatgpt_user_id,
    auth.chatgpt_user_id,
    auth.user_id,
    idAuth.chatgpt_user_id,
    idAuth.user_id
  );
  const planType = firstNonEmpty(
    account?.planType,
    account?.plan_type,
    record.planType,
    record.plan_type,
    providerSpecificData?.chatgptPlanType,
    providerSpecificData?.chatgpt_plan_type,
    credentials?.plan_type,
    auth.chatgpt_plan_type,
    idAuth.chatgpt_plan_type
  );

  const now = options.now ?? new Date();
  const syntheticIdToken = inputIdToken
    ? undefined
    : buildSyntheticCodexIdToken({ email, accountId, planType, userId, expiresAt, now });
  const idToken = firstNonEmpty(inputIdToken, syntheticIdToken);
  const name = firstNonEmpty(email, accountId, 'ChatGPT Account');
  const cpa = stripUnavailable({
    type: 'codex',
    account_id: accountId,
    chatgpt_account_id: accountId,
    email,
    name,
    plan_type: planType,
    chatgpt_plan_type: planType,
    id_token: idToken,
    id_token_synthetic: Boolean(syntheticIdToken) || undefined,
    access_token: accessToken,
    refresh_token: refreshToken || '',
    session_token: sessionToken,
    last_refresh: normalizeTimestamp(now),
    expired: expiresAt,
    disabled: record.disabled === true ? true : undefined,
  });
  const fileToken = toFileToken(email, toFileToken(accountId, 'chatgpt-session'));

  return {
    fileName: `chatgpt-session-${fileToken}.json`,
    content: JSON.stringify(cpa, null, 2),
    json: cpa,
  };
};
