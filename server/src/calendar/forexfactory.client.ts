import * as https from 'https';

// Cloudflare in front of ForexFactory fingerprints the HTTP client, and which Node client
// passes depends on the Node/OpenSSL build (on Render's node:20 image `fetch` passes and
// `https` is challenged; on newer Node it is the reverse). So: identify honestly — spoofing
// a browser UA is what gets challenged — and fall back to the other client on a block.

const USER_AGENT = 'RedNewsBot/1.0 (+https://rednews.app)';
const TIMEOUT_MS = 20_000;

export const FF_BASE = 'https://www.forexfactory.com';
export const FF_FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

export class FfUnavailableError extends Error {}

interface Attempt {
  status: number;
  body: string;
}

const isBlocked = (a: Attempt) => a.status === 403 || a.status === 429 || a.status === 503;

async function viaFetch(url: string, accept: string): Promise<Attempt> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, body: await res.text() };
}

function viaHttps(url: string, accept: string): Promise<Attempt> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept }, timeout: TIMEOUT_MS }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

export async function ffGet(url: string, accept = '*/*'): Promise<string> {
  const failures: string[] = [];
  for (const [name, client] of [
    ['fetch', viaFetch],
    ['https', viaHttps],
  ] as const) {
    try {
      const attempt = await client(url, accept);
      if (attempt.status >= 200 && attempt.status < 300) return attempt.body;
      failures.push(`${name} HTTP ${attempt.status}`);
      if (!isBlocked(attempt)) break; // a real 404/500 won't change with another client
    } catch (e) {
      failures.push(`${name} ${(e as Error).message}`);
    }
  }
  throw new FfUnavailableError(`${url} — ${failures.join(', ')}`);
}
