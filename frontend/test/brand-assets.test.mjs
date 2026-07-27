import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PUBLIC_DIR = new URL('../public/', import.meta.url);

const families = {
  'logo-full': { blue: '#72CDFE', white: '#FFFFFF', black: '#000000' },
  icon: { blue: '#72CDFE', white: '#FFFFFF', black: '#161616' },
};

function geometry(svg) {
  return {
    viewBox: svg.match(/viewBox="([^"]+)"/)?.[1],
    paths: [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(match => match[1]),
    circles: [...svg.matchAll(/<circle[^>]*(?:\/>|><\/circle>)/g)].map(match =>
      Object.fromEntries([...match[0].matchAll(/\s(cx|cy|r)="([^"]+)"/g)].map(attribute => attribute.slice(1))),
    ),
  };
}

for (const [family, variants] of Object.entries(families)) {
  test(`${family} variants preserve the original geometry`, async () => {
    const files = await Promise.all(
      Object.entries(variants).map(async ([variant, expectedColor]) => {
        const svg = await readFile(new URL(`${family}-${variant}.svg`, PUBLIC_DIR), 'utf8');
        const colors = [
          ...svg.matchAll(/(?:fill="|fill:\s*)(#[0-9A-Fa-f]{3,6})/g),
        ].map(match => match[1].toUpperCase().replace(/^#([0-9A-F])([0-9A-F])([0-9A-F])$/, '#$1$1$2$2$3$3'));

        assert.ok(colors.length > 0);
        assert.deepEqual([...new Set(colors)], [expectedColor]);
        return svg;
      }),
    );

    const expectedGeometry = geometry(files[0]);
    files.slice(1).forEach(svg => assert.deepEqual(geometry(svg), expectedGeometry));
  });
}
