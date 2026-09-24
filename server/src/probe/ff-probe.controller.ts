import { Controller, Get } from '@nestjs/common';
import * as https from 'https';

// Temporary: checks whether ForexFactory is reachable from Render's datacenter IP
// (Cloudflare may challenge non-residential IPs). Remove once the answer is known.

const FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const HTML_URL = 'https://www.forexfactory.com/calendar';
const FF = 'https://www.forexfactory.com';

const HONEST_UA = { 'User-Agent': 'RedNewsBot/1.0 (+https://rednews.app)', Accept: '*/*' };
const BROWSER_UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

type Transport = 'fetch' | 'https';

// Cloudflare fingerprints the client: locally, Node's fetch (undici) is challenged with any
// headers, while the plain https module passes unless it claims to be a browser.
const VARIANTS: Record<string, { transport: Transport; headers: Record<string, string> }> = {
  fetch_honestUA: { transport: 'fetch', headers: HONEST_UA },
  https_bare: { transport: 'https', headers: {} },
  https_honestUA: { transport: 'https', headers: HONEST_UA },
  https_browserUA: { transport: 'https', headers: BROWSER_UA },
};

interface RawResponse {
  status: number;
  cfMitigated: string | undefined;
  body: string;
}

async function rawGet(url: string, headers: Record<string, string>, transport: Transport): Promise<RawResponse> {
  if (transport === 'fetch') {
    const res = await fetch(url, { headers, redirect: 'follow' });
    return { status: res.status, cfMitigated: res.headers.get('cf-mitigated') ?? undefined, body: await res.text() };
  }
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers, timeout: 20000 }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (d: string) => (body += d));
        res.on('end', () => {
          const cf = res.headers['cf-mitigated'];
          resolve({ status: res.statusCode ?? 0, cfMitigated: Array.isArray(cf) ? cf[0] : cf, body });
        });
      })
      .on('timeout', function (this: { destroy(e: Error): void }) {
        this.destroy(new Error('timeout'));
      })
      .on('error', reject);
  });
}

// Each probe hit costs several upstream requests, so results are reused for a while.
const CACHE_MS = 5 * 60 * 1000;

interface ProbeResult {
  url: string;
  ok: boolean;
  status?: number;
  ms: number;
  bytes?: number;
  cfChallenge?: boolean;
  cfMitigated?: string;
  jsonValid?: boolean;
  jsonCount?: number;
  hasCalendarStates?: boolean;
  snippet?: string;
  error?: string;
  body?: string;
}

function looksLikeCfChallenge(status: number, cfMitigated: string | undefined, body: string): boolean {
  if (status === 403 || status === 503 || status === 429) return true;
  if ((cfMitigated ?? '').toLowerCase() === 'challenge') return true;
  const b = body.slice(0, 4000).toLowerCase();
  return (
    b.includes('just a moment') ||
    b.includes('attention required') ||
    b.includes('cf-challenge') ||
    b.includes('challenge-platform') ||
    b.includes('enable javascript and cookies')
  );
}

async function probe(url: string, headers: Record<string, string>, transport: Transport = 'fetch'): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await rawGet(url, headers, transport);
    const body = res.body;
    const ok = res.status >= 200 && res.status < 300;
    let jsonValid = false;
    let jsonCount: number | undefined;
    try {
      const data: unknown = JSON.parse(body);
      jsonValid = true;
      if (Array.isArray(data)) jsonCount = data.length;
    } catch {
      /* HTML page — not JSON */
    }
    return {
      url,
      ok,
      status: res.status,
      ms: Date.now() - started,
      bytes: body.length,
      cfChallenge: looksLikeCfChallenge(res.status, res.cfMitigated, body),
      cfMitigated: res.cfMitigated,
      jsonValid,
      jsonCount,
      hasCalendarStates: body.includes('calendarComponentStates'),
      snippet: body.slice(0, 160).replace(/\s+/g, ' '),
      body,
    } as ProbeResult;
  } catch (e) {
    return { url, ok: false, ms: Date.now() - started, error: String(e) };
  }
}

async function egressIp(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const j = (await r.json()) as { ip?: string };
    return j.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function strip(r: ProbeResult): ProbeResult {
  const { body: _body, ...rest } = r;
  return rest;
}

@Controller('probe')
export class FfProbeController {
  private cached: { at: number; report: unknown } | null = null;

  @Get('ff')
  async ff() {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) {
      return { cachedFor: `${Math.round((Date.now() - this.cached.at) / 1000)}s`, ...(this.cached.report as object) };
    }

    const variants = Object.entries(VARIANTS);
    const probeAll = (url: string) =>
      Promise.all(variants.map(async ([name, v]) => [name, await probe(url, v.headers, v.transport)] as const));

    const [ip, feed, htmlRuns] = await Promise.all([
      egressIp(),
      probe(FEED_URL, {}),
      probeAll(HTML_URL),
    ]);

    // details/graph need a real event id — take one from whichever calendar page loaded
    const loaded = htmlRuns.find(([, r]) => r.ok && r.hasCalendarStates);
    const eventId = loaded?.[1].body?.match(/"id":(\d+),"ebaseId"/)?.[1];
    const [detailsRuns, graphRuns] = eventId
      ? await Promise.all([
          probeAll(`${FF}/calendar/details/1-${eventId}`),
          probeAll(`${FF}/calendar/graph/${eventId}?limit=5&site_id=1`),
        ])
      : [[], []];

    const passing = (runs: ReadonlyArray<readonly [string, ProbeResult]>, needsStates = false) =>
      runs
        .filter(([, r]) => r.ok && (needsStates ? !!r.hasCalendarStates : !!r.jsonValid))
        .map(([name]) => name);
    const table = (runs: ReadonlyArray<readonly [string, ProbeResult]>) =>
      Object.fromEntries(runs.map(([name, r]) => [name, strip(r)]));

    const feedOk = feed.ok && !!feed.jsonValid && (feed.jsonCount ?? 0) > 0;
    const htmlPass = passing(htmlRuns, true);

    const report = {
      ranAt: new Date().toISOString(),
      egressIp: ip,
      eventIdUsed: eventId ?? null,
      summary: {
        feedOk,
        htmlWorksWith: htmlPass,
        detailsWorksWith: passing(detailsRuns),
        graphWorksWith: passing(graphRuns),
      },
      verdict:
        feedOk && htmlPass.length
          ? `GREEN: feed and HTML reachable from this server (HTML via: ${htmlPass.join(', ')})`
          : feedOk
            ? 'YELLOW: feed works, HTML blocked for every header variant'
            : 'RED: feed blocked — check errors below',
      results: {
        feed: strip(feed),
        html: table(htmlRuns),
        details: eventId ? table(detailsRuns) : 'skipped (no event id)',
        graph: eventId ? table(graphRuns) : 'skipped (no event id)',
      },
    };

    this.cached = { at: Date.now(), report };
    return report;
  }
}
