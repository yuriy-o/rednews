/**
 * esbuild configuration for Red News Chrome Extension
 * © 2026 Yuriy Orekhov. All rights reserved.
 *
 * Bundles TypeScript source files into production-ready JavaScript
 */

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

const baseOptions = {
  bundle: false,
  sourcemap: isDev ? 'inline' : false,
  minify: !isDev,
  target: 'ES2020',
  loader: {
    '.json': 'text',
  },
};

const entryPoints = [
  'extension/src/shared.ts',
  'extension/src/background.ts',
  'extension/src/inject.ts',
  'extension/src/content.ts',
  'extension/src/popup.ts',
];

const outdir = 'extension/dist';

// Ensure output directory exists
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

async function build() {
  try {
    console.log(`Building Red News extension ${isDev ? '(dev)' : '(production)'}...`);

    const result = await esbuild.build({
      ...baseOptions,
      entryPoints,
      outdir,
      outExtension: { '.js': '.js' },
      external: [],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
      },
    });

    console.log('✅ Build successful');
    console.log(`   Wrote ${entryPoints.length} bundles to ${outdir}/`);

    if (result.warnings.length > 0) {
      console.warn('⚠️  Warnings:');
      result.warnings.forEach((w) => console.warn(`   ${w}`));
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

if (isWatch) {
  const ctx = await esbuild.context({ ...baseOptions, entryPoints, outdir });
  await ctx.watch();
  console.log('👀 Watching for changes...');
} else {
  await build();
}
