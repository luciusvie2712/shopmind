const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'jwtaccesssecret',
  'geminiapikey',
  'apikey',
  'databaseurl',
  'redisurl',
  'prompt',
  'fullprompt',
  'systeminstruction',
  'requestbody',
  'responsebody',
]);

function normalizedKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function redactLogValue(value: unknown): unknown {
  return redact(value, new WeakSet<object>());
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return value.map((item) => redact(item, seen));
  }
  if (typeof value !== 'object' || value === null) return value;
  if (value instanceof Error) {
    return { name: value.name };
  }
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      SENSITIVE_KEYS.has(normalizedKey(key)) ? REDACTED : redact(nested, seen),
    ]),
  );
}
