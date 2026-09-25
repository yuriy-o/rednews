// Illustrative price line for the home chart. It is labelled as illustrative on the page:
// real prices need a data source (PRODUCT.md). Deterministic per week, so server and client
// render the same path, and volatility rises right after each news release, as it does in life.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Points as [x, y] fractions (0–1) of the plot area, y measured from the top.
 * `newsAt` are x fractions of news lines; noise is amplified shortly after each.
 */
export function illustrativePricePath(seedKey: string, newsAt: number[], count = 220): [number, number][] {
  const rand = mulberry32(hash(seedKey));
  const gauss = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  let v = 0;
  let drift = 0;
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    let vol = 1;
    for (const n of newsAt) {
      const after = x - n;
      if (after >= 0 && after < 0.05) vol += 3.2 * (1 - after / 0.05);
    }
    drift = drift * 0.96 + gauss() * 0.04;
    v += drift + gauss() * 0.5 * vol;
    raw.push(v);
  }

  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const span = max - min || 1;
  // Keep the path in the middle band so flags at the top never sit on it.
  return raw.map((r, i) => [i / (count - 1), 0.35 + (1 - (r - min) / span) * 0.5]);
}
