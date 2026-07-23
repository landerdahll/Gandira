import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PUBLIC_DIR = new URL('../public/', import.meta.url);

const families = {
  logo: { blue: '#72CDFE', white: '#FFFFFF', black: '#161616' },
  icon: { blue: '#72CDFE', white: '#FFFFFF', black: '#161616' },
};

function withoutColor(svg) {
  return svg.replaceAll(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="COLOR"');
}

for (const [family, variants] of Object.entries(families)) {
  test(`${family} variants preserve the original geometry`, async () => {
    const files = await Promise.all(
      Object.entries(variants).map(async ([variant, expectedColor]) => {
        const svg = await readFile(new URL(`${family}-${variant}.svg`, PUBLIC_DIR), 'utf8');
        const colors = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(match => match[1]);

        assert.ok(colors.length > 0);
        assert.deepEqual([...new Set(colors)], [expectedColor]);
        return svg;
      }),
    );

    const geometry = withoutColor(files[0]);
    files.slice(1).forEach(svg => assert.equal(withoutColor(svg), geometry));
  });
}
