/** Reads a required env var; the app must not start with a guessable default (the repo is public). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

/** Comma-separated list, e.g. CORS_ORIGIN="https://rednews.app,https://beta.rednews.app". */
export function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
