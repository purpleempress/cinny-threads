import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const threadFiles = [
  'src/app/features/room/ThreadReplyInput.tsx',
  'src/app/features/room/ThreadSummary.tsx',
  'src/app/features/room/ThreadsDrawer.tsx',
  'src/app/hooks/useThreadUnreadCount.ts',
  'src/app/state/room/threadSelection.ts',
];

test('the dedicated thread interface is present', async () => {
  await Promise.all(threadFiles.map((path) => read(path)));

  const room = await read('src/app/features/room/Room.tsx');
  const timeline = await read('src/app/features/room/RoomTimeline.tsx');
  assert.match(room, /ThreadsDrawer/);
  assert.match(timeline, /ThreadSummary/);
});

test('thread replies use a Matrix m.thread relation without timeline fallback', async () => {
  const input = await read('src/app/features/room/ThreadReplyInput.tsx');
  assert.match(input, /RelationType\.Thread/);
  assert.match(input, /event_id:\s*rootEventId/);
  assert.match(input, /is_falling_back:\s*false/);
});

test('thread reply counts use correct singular and plural spelling', async () => {
  const { formatReplyCount } = await import('../src/app/utils/formatReplyCount.js');
  const summary = await read('src/app/features/room/ThreadSummary.tsx');
  const drawer = await read('src/app/features/room/ThreadsDrawer.tsx');

  assert.equal(formatReplyCount(1), '1 reply');
  assert.equal(formatReplyCount(11), '11 replies');
  assert.match(summary, /formatReplyCount\(replyCount\)/);
  assert.match(drawer, /formatReplyCount\(replyCount\)/);
});

test('Matrix SDK thread aggregation is explicitly enabled', async () => {
  const initMatrix = await read('src/client/initMatrix.ts');
  assert.match(initMatrix, /threadSupport:\s*true/);
});

test('automatic thread backfill has a hard page limit', async () => {
  const drawer = await read('src/app/features/room/ThreadsDrawer.tsx');
  assert.match(drawer, /MAX_THREAD_BACKFILL_PAGES\s*=\s*20/);
  assert.match(drawer, /page\s*<\s*MAX_THREAD_BACKFILL_PAGES/);
  assert.doesNotMatch(drawer, /while\s*\(!cancelled\)/);
});

test('the thread interface defaults on and remains user-configurable', async () => {
  const settings = await read('src/app/state/settings.ts');
  const generalSettings = await read('src/app/features/settings/general/General.tsx');
  assert.match(settings, /threadsDrawer:\s*true/);
  assert.match(generalSettings, /threadsDrawer/);
});

test('the thread-only fork contains no Cytale SSO implementation', async () => {
  const productionFiles = [
    'src/index.tsx',
    'src/app/hooks/useClientConfig.ts',
    'src/app/pages/auth/SSOLogin.tsx',
    'src/app/pages/auth/login/Login.tsx',
    'src/app/pages/auth/register/Register.tsx',
  ];
  const source = (await Promise.all(productionFiles.map((path) => read(path)))).join('\n');
  assert.doesNotMatch(source, /Cytale|cytale:\/\/|ssoRedirectScheme/);
});
