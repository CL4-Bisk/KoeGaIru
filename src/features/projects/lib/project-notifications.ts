export type ProjectNotificationType = "COMMENT_MENTION";

export type ProjectMemberMentionTarget = {
  userId: string;
  username: string;
  name: string;
};

export type ProjectMentionMembershipPublicData = {
  userId: string;
  identifier: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type ProjectMentionUserRecord = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type ProjectMentionNotificationCreateInput = {
  type: ProjectNotificationType;
  orgId: string;
  projectId: string;
  blockId: string;
  commentId: string;
  recipientUserId: string;
  recipientUsername: string;
  actorUserId: string;
  actorName: string;
  title: string;
  body: string;
};

function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

function getNotificationBody(commentBody: string) {
  const body = commentBody.trim();

  if (body.length <= 180) {
    return body;
  }

  return `${body.slice(0, 177).trimEnd()}...`;
}

function getDisplayName({
  username,
  firstName,
  lastName,
}: {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  return name || username;
}

export function getProjectMemberMentionTargets({
  memberships,
  users,
}: {
  memberships: ProjectMentionMembershipPublicData[];
  users: ProjectMentionUserRecord[];
}) {
  const memberUserIds = new Set(memberships.map((member) => member.userId));
  const targets: ProjectMemberMentionTarget[] = [];

  for (const user of users) {
    if (!memberUserIds.has(user.id) || !user.username) {
      continue;
    }

    const username = normalizeUsername(user.username);

    targets.push({
      userId: user.id,
      username,
      name: getDisplayName({
        username,
        firstName: user.firstName,
        lastName: user.lastName,
      }),
    });
  }

  return targets;
}

export function getMentionedProjectMembers({
  mentionedUsernames,
  authorId,
  members,
}: {
  mentionedUsernames: string[];
  authorId: string;
  members: ProjectMemberMentionTarget[];
}) {
  const wantedUsernames = new Set(mentionedUsernames.map(normalizeUsername));
  const usedUserIds = new Set<string>();
  const recipients: ProjectMemberMentionTarget[] = [];

  for (const member of members) {
    const username = normalizeUsername(member.username);

    if (
      member.userId === authorId ||
      usedUserIds.has(member.userId) ||
      !wantedUsernames.has(username)
    ) {
      continue;
    }

    usedUserIds.add(member.userId);
    recipients.push({
      ...member,
      username,
    });
  }

  return recipients;
}

export function getProjectMentionNotificationCreateManyData({
  orgId,
  projectId,
  blockId,
  commentId,
  actorUserId,
  actorName,
  commentBody,
  recipients,
}: {
  orgId: string;
  projectId: string;
  blockId: string;
  commentId: string;
  actorUserId: string;
  actorName: string;
  commentBody: string;
  recipients: ProjectMemberMentionTarget[];
}) {
  const title = `${actorName} mentioned you`;
  const body = getNotificationBody(commentBody);

  return recipients.map(
    (recipient): ProjectMentionNotificationCreateInput => ({
      type: "COMMENT_MENTION",
      orgId,
      projectId,
      blockId,
      commentId,
      recipientUserId: recipient.userId,
      recipientUsername: recipient.username,
      actorUserId,
      actorName,
      title,
      body,
    }),
  );
}
