import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createClient,
  EventTimelineSet,
  EventType,
  MatrixEvent,
  MatrixEventEvent,
  RelationType,
} from 'matrix-js-sdk';

import {
  getRenderableThreadEvents,
  getThreadEventRenderState,
} from '../src/app/features/room/threadEventPresentation.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const makeMessageEvent = ({ id, timestamp, body, relation, newContent }) =>
  new MatrixEvent({
    event_id: id,
    room_id: '!thread:example.org',
    sender: '@alice:example.org',
    origin_server_ts: timestamp,
    type: EventType.RoomMessage,
    content: {
      msgtype: 'm.text',
      body,
      ...(newContent && { 'm.new_content': newContent }),
      ...(relation && { 'm.relates_to': relation }),
    },
  });

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

test('thread rendering folds repeated edits into the original message', async () => {
  const client = createClient({ baseUrl: 'https://example.invalid' });
  const timelineSet = new EventTimelineSet(undefined, { timelineSupport: true }, client);
  const original = makeMessageEvent({
    id: '$original',
    timestamp: 1,
    body: 'Original body',
  });
  const firstEdit = makeMessageEvent({
    id: '$edit-one',
    timestamp: 2,
    body: '* First edit',
    newContent: { msgtype: 'm.text', body: 'First edit' },
    relation: { rel_type: RelationType.Replace, event_id: '$original' },
  });
  const newestEdit = makeMessageEvent({
    id: '$edit-two',
    timestamp: 3,
    body: '* Newest edit',
    newContent: { msgtype: 'm.text', body: 'Newest edit' },
    relation: { rel_type: RelationType.Replace, event_id: '$original' },
  });
  const reply = makeMessageEvent({
    id: '$reply',
    timestamp: 4,
    body: 'Normal reply',
    relation: { rel_type: RelationType.Thread, event_id: '$original' },
  });

  [original, firstEdit, newestEdit, reply].forEach((event) => {
    timelineSet.addEventToTimeline(event, timelineSet.getLiveTimeline(), {
      toStartOfTimeline: false,
      addToState: false,
    });
  });
  await Promise.resolve();

  const timelineEvents = timelineSet.getLiveTimeline().getEvents();
  assert.deepEqual(
    timelineEvents.map((event) => event.getId()),
    ['$original', '$edit-one', '$edit-two', '$reply']
  );
  const replacements = timelineSet.relations.getChildEventsForEvent(
    '$original',
    RelationType.Replace,
    EventType.RoomMessage
  );
  assert.deepEqual(
    replacements?.getRelations().map((event) => event.getId()),
    ['$edit-one', '$edit-two']
  );

  const renderable = getRenderableThreadEvents(timelineEvents, original);
  assert.deepEqual(
    renderable.map((event) => event.getId()),
    ['$original', '$reply']
  );

  const editedEvent = original.replacingEvent() ?? undefined;
  const renderState = getThreadEventRenderState(original, editedEvent);
  assert.equal(editedEvent?.getId(), '$edit-two');
  assert.equal(renderState.content.body, 'Newest edit');
  assert.equal(renderState.edited, true);
});

test('decrypted thread events retain messages and suppress replacements', async () => {
  const client = createClient({ baseUrl: 'https://example.invalid' });
  const timelineSet = new EventTimelineSet(undefined, { timelineSupport: true }, client);
  const encryptedOriginal = new MatrixEvent({
    event_id: '$encrypted-original',
    room_id: '!thread:example.org',
    sender: '@alice:example.org',
    origin_server_ts: 1,
    type: EventType.RoomMessageEncrypted,
    content: { algorithm: 'm.megolm.v1.aes-sha2', ciphertext: 'original' },
  });
  const encryptedEdit = new MatrixEvent({
    event_id: '$encrypted-edit',
    room_id: '!thread:example.org',
    sender: '@alice:example.org',
    origin_server_ts: 2,
    type: EventType.RoomMessageEncrypted,
    content: {
      algorithm: 'm.megolm.v1.aes-sha2',
      ciphertext: 'edit',
      'm.relates_to': {
        rel_type: RelationType.Replace,
        event_id: '$encrypted-original',
      },
    },
  });
  const encryptedReply = new MatrixEvent({
    event_id: '$encrypted-reply',
    room_id: '!thread:example.org',
    sender: '@alice:example.org',
    origin_server_ts: 3,
    type: EventType.RoomMessageEncrypted,
    content: {
      algorithm: 'm.megolm.v1.aes-sha2',
      ciphertext: 'reply',
      'm.relates_to': {
        rel_type: RelationType.Thread,
        event_id: '$encrypted-original',
      },
    },
  });

  [encryptedOriginal, encryptedEdit, encryptedReply].forEach((event) => {
    timelineSet.addEventToTimeline(event, timelineSet.getLiveTimeline(), {
      toStartOfTimeline: false,
      addToState: false,
    });
  });

  assert.deepEqual(
    getRenderableThreadEvents(timelineSet.getLiveTimeline().getEvents(), encryptedOriginal).map(
      (event) => event.getId()
    ),
    ['$encrypted-original', '$encrypted-reply']
  );

  encryptedOriginal.setClearData({
    clearEvent: {
      type: EventType.RoomMessage,
      content: { msgtype: 'm.text', body: 'Encrypted original' },
    },
  });
  encryptedEdit.setClearData({
    clearEvent: {
      type: EventType.RoomMessage,
      content: {
        msgtype: 'm.text',
        body: '* Encrypted edit',
        'm.new_content': { msgtype: 'm.text', body: 'Encrypted edit' },
      },
    },
  });
  encryptedReply.setClearData({
    clearEvent: {
      type: EventType.RoomMessage,
      content: { msgtype: 'm.text', body: 'Encrypted reply' },
    },
  });
  encryptedEdit.emit(MatrixEventEvent.Decrypted, encryptedEdit, null);
  encryptedReply.emit(MatrixEventEvent.Decrypted, encryptedReply, null);
  await Promise.resolve();

  const renderable = getRenderableThreadEvents(
    timelineSet.getLiveTimeline().getEvents(),
    encryptedOriginal
  );
  assert.deepEqual(
    renderable.map((event) => event.getId()),
    ['$encrypted-original', '$encrypted-reply']
  );
  const encryptedRenderState = getThreadEventRenderState(
    encryptedOriginal,
    encryptedOriginal.replacingEvent() ?? undefined
  );
  assert.equal(encryptedRenderState.content.body, 'Encrypted edit');
  assert.equal(encryptedRenderState.edited, true);
  assert.equal(
    getThreadEventRenderState(encryptedReply, undefined).content.body,
    'Encrypted reply'
  );
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
