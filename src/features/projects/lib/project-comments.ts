const MENTION_PATTERN = /(^|[^\w@.])@([a-zA-Z0-9_-]{2,32})\b/g;

export function extractMentionUsernames(body: string) {
  const mentions = new Set<string>();

  for (const match of body.matchAll(MENTION_PATTERN)) {
    mentions.add(match[2].toLowerCase());
  }

  return Array.from(mentions);
}

export function getProjectCommentCreateData({
  blockId,
  orgId,
  authorId,
  authorName,
  body,
}: {
  blockId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  body: string;
}) {
  const trimmedBody = body.trim();

  return {
    blockId,
    orgId,
    authorId,
    authorName,
    body: trimmedBody,
    mentionedUsernames: extractMentionUsernames(trimmedBody),
  };
}
