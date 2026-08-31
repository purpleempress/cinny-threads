import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { generatePath } from 'react-router-dom';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const dynamicRouteValues = [
  ['room ID', '/direct/:roomIdOrAlias/', '!PdQNbbuBruquLLvbnl:flourish.ch'],
  ['room alias', '/home/:roomIdOrAlias/', '#birdhouse:flourish.ch'],
  ['event ID', '/direct/:roomIdOrAlias/:eventId/', '!room:flourish.ch', '$event:flourish.ch'],
  ['space ID', '/:spaceIdOrAlias/', '!space:flourish.ch'],
  ['homeserver', '/login/:server/', 'matrix.flourish.ch'],
];

test('React Router encodes Matrix route parameters exactly once', () => {
  for (const [label, pattern, ...values] of dynamicRouteValues) {
    const params =
      values.length === 2
        ? { roomIdOrAlias: values[0], eventId: values[1] }
        : pattern.includes('roomIdOrAlias')
        ? { roomIdOrAlias: values[0] }
        : pattern.includes('spaceIdOrAlias')
        ? { spaceIdOrAlias: values[0] }
        : { server: values[0] };

    const path = generatePath(pattern, params);
    assert.doesNotMatch(path, /%25(?:21|23|24|3A)/i, `${label} was encoded twice`);

    const routeSegments = path.split('/').filter(Boolean);
    const decodedValues = routeSegments.map((segment) => decodeURIComponent(segment));
    for (const value of values) {
      assert.ok(decodedValues.includes(value), `${label} did not round-trip through the route`);
    }
  }
});

test('Cinny passes raw dynamic values to generatePath', async () => {
  const [pathUtils, authLayout] = await Promise.all([
    read('src/app/pages/pathUtils.ts'),
    read('src/app/pages/auth/AuthLayout.tsx'),
  ]);

  for (const [file, source] of [
    ['src/app/pages/pathUtils.ts', pathUtils],
    ['src/app/pages/auth/AuthLayout.tsx', authLayout],
  ]) {
    assert.doesNotMatch(
      source,
      /(?:server|roomIdOrAlias|spaceIdOrAlias|eventId):\s*(?:[^\n]*\?\s*)?encodeURIComponent\(/,
      `${file} pre-encodes a generatePath parameter`
    );
  }
});
