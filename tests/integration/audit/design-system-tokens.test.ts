import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { COLOR_CONFIG } from '@/data/settings';

describe('Design System Tokens & Semantic Color Audit', () => {
  const rootDir = process.cwd();

  it('defines all required semantic tokens in tokens.css for both :root and .dark', () => {
    const tokensPath = path.resolve(rootDir, 'src/styles/tokens.css');
    const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

    const requiredTokens = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--border',
      '--input',
    ];

    for (const token of requiredTokens) {
      expect(tokensContent).toContain(token);
    }

    const palettePath = path.resolve(rootDir, 'src/styles/palette.css');
    const paletteContent = fs.readFileSync(palettePath, 'utf-8');
    const themeAccents = [
      '--theme-cyan',
      '--theme-green',
      '--theme-blue',
      '--theme-orange',
      '--theme-purple',
      '--theme-red',
    ];
    for (const accent of themeAccents) {
      expect(paletteContent).toContain(accent);
    }
  });

  it('defines dynamic palette tokens (--accent-*-raw, --accent-*-dot, --accent-*-badge-*) for every ColorToken', () => {
    const palettePath = path.resolve(rootDir, 'src/styles/palette.css');
    const paletteContent = fs.readFileSync(palettePath, 'utf-8');

    for (const token of Object.keys(COLOR_CONFIG)) {
      expect(paletteContent).toContain(`--accent-${token}-raw`);
      expect(paletteContent).toContain(`--accent-${token}-dot`);
      expect(paletteContent).toContain(`--accent-${token}-badge-bg`);
    }
  });

  it('ensures test fixtures do not introduce hardcoded Tailwind color scales', () => {
    const fixturesDir = path.resolve(rootDir, 'tests/fixtures');
    const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    const forbiddenScalePattern =
      /\b(emerald|cyan|amber|rose|violet|indigo|sky|blue|red|green|yellow|slate|zinc|gray)-[0-9]{2,3}\b/;

    for (const file of files) {
      const content = fs.readFileSync(path.join(fixturesDir, file), 'utf-8');
      expect(content).not.toMatch(forbiddenScalePattern);
    }
  });
});
