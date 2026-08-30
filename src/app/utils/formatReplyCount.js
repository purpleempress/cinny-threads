export function formatReplyCount(count) {
  return `${count} ${count === 1 ? 'reply' : 'replies'}`;
}
