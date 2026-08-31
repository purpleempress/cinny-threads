// @ts-check

import { EventType, RelationType } from 'matrix-js-sdk';

/**
 * Keep the thread root exactly once, retain the event types supported by the
 * thread drawer, and hide replacement events from rendering without removing
 * them from the timeline or relation store.
 *
 * @param {import('matrix-js-sdk').MatrixEvent[]} liveEvents
 * @param {import('matrix-js-sdk').MatrixEvent | undefined} rootEvent
 * @returns {import('matrix-js-sdk').MatrixEvent[]}
 */
export function getRenderableThreadEvents(liveEvents, rootEvent) {
  const rootId = rootEvent?.getId();
  const alreadyHasRoot = Boolean(rootId) && liveEvents.some((event) => event.getId() === rootId);
  const events = alreadyHasRoot || !rootEvent ? liveEvents : [rootEvent, ...liveEvents];

  return events.filter((event) => {
    if (event.getRelation()?.rel_type === RelationType.Replace) return false;

    const eventType = event.getType();
    return (
      eventType === EventType.RoomMessage ||
      eventType === EventType.RoomMessageEncrypted ||
      eventType === EventType.Sticker
    );
  });
}

/**
 * Resolve the content and edited state used by RenderMessageContent.
 *
 * @param {import('matrix-js-sdk').MatrixEvent} event
 * @param {import('matrix-js-sdk').MatrixEvent | undefined} editedEvent
 */
export function getThreadEventRenderState(event, editedEvent) {
  return {
    content: editedEvent?.getContent()['m.new_content'] ?? event.getContent(),
    edited: Boolean(editedEvent ?? event.replacingEvent()),
  };
}
