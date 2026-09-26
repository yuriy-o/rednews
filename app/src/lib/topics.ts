// Event topics — ported 1:1 from the extension's TOPICS (extension/shared.js) so the site and the
// extension filter identically; keep the two in sync. Matched against Forex Factory TITLES, which
// are not the market acronyms: NFP is "Non-Farm Employment Change", the Fed decision is "Federal
// Funds Rate". `not` carves out look-alikes (ADP, members' speeches). Topics cut across impact
// levels — CPI and most speeches are often Medium.

export const KEY_EVENTS = ['NFP', 'CPI', 'FOMC'] as const;
export const CATEGORIES = ['jobs', 'inflation', 'banks', 'growth', 'speeches'] as const;
export const TOPICS = [...KEY_EVENTS, ...CATEGORIES] as const;
export type Topic = (typeof TOPICS)[number];

const RULES: Record<Topic, { re: RegExp; not?: RegExp }> = {
  NFP: { re: /^Non-Farm Employment Change$/i },
  CPI: { re: /\bCPI\b/i },
  FOMC: { re: /\bFOMC\b|^Federal Funds Rate$/i, not: /\bMember\b|\bSpeaks\b/i },
  jobs: { re: /Employment|Unemployment|Payrolls|Claimant|Jobless|JOLTS|Job Openings|Average (Hourly )?Earnings|Wage/i },
  inflation: { re: /\bCPI\b|\bPPI\b|\bPCE\b|Inflation|\bHICP\b|\bRPI\b/i },
  banks: {
    re: /Funds Rate|Cash Rate|Bank Rate|Policy Rate|Refinancing Rate|Overnight Rate|Deposit Facility|Loan Prime Rate|Interest Rate|Monetary Policy|\bFOMC\b|\bMPC\b|Meeting Minutes|Press Conference|Economic Projections|Rate Statement/i,
    not: /\bSpeaks\b|Testifies/i,
  },
  growth: { re: /\bGDP\b|Retail Sales|\bPMI\b|Industrial Production|Manufacturing|Factory Orders|Durable Goods|\bISM\b/i },
  speeches: { re: /\bSpeaks\b|Testifies|Testimony|Speech/i },
};

export function topicMatch(topic: Topic, title: string): boolean {
  const r = RULES[topic];
  return r.re.test(title) && !(r.not && r.not.test(title));
}

/** Any selected topic matching keeps the event (OR). Nothing selected = no topic filtering. */
export function topicsOk(selected: readonly Topic[], title: string): boolean {
  return !selected.length || selected.some((t) => topicMatch(t, title));
}

export const isTopic = (v: string): v is Topic => (TOPICS as readonly string[]).includes(v);
