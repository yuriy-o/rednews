import { Archivo } from 'next/font/google';

// Variable width is the typographic voice (DESIGN.md): headings slightly expanded,
// data and axis labels narrow. Self-hosted at build time by next/font.
export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});
