const MENTION_PATTERN = /(^|[^\w@.])@([a-zA-Z0-9_-]{2,32})\b/g;

export type ProjectCommentMentionCollaborator = {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
};

export type ProjectCommentMentionSuggestion = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
};

export function extractMentionUsernames(body: string) {
  const mentions = new Set<string>();

  for (const match of body.matchAll(MENTION_PATTERN)) {
    mentions.add(match[2].toLowerCase());
  }

  return Array.from(mentions);
}

function normalizeMentionUsername(value: string | undefined) {
  const username = value
    ?.trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (!username || username.length < 2) {
    return null;
  }

  return username.slice(0, 32);
}

export function getProjectCommentMentionSuggestions(
  collaborators: ProjectCommentMentionCollaborator[],
) {
  const usedUsernames = new Set<string>();
  const usedNames = new Set<string>();
  const suggestions: ProjectCommentMentionSuggestion[] = [];

  for (const collaborator of collaborators) {
    const username = normalizeMentionUsername(
      collaborator.username ?? collaborator.name,
    );
    const name = collaborator.name ?? username ?? "";
    const nameKey = name.trim().toLowerCase();

    if (
      !username ||
      usedUsernames.has(username) ||
      (nameKey.length > 0 && usedNames.has(nameKey))
    ) {
      continue;
    }

    usedUsernames.add(username);
    if (nameKey.length > 0) {
      usedNames.add(nameKey);
    }
    suggestions.push({
      id: collaborator.id,
      name,
      username,
      avatar: collaborator.avatar,
    });
  }

  return suggestions;
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
