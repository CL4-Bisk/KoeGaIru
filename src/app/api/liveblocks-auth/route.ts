import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { env } from "@/lib/env";

const liveblocks = new Liveblocks({
  secret: env.LIVEBLOCKS_SECRET_KEY,
});

export async function POST() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await currentUser();

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name:
        user?.fullName ??
        user?.username ??
        user?.primaryEmailAddress?.emailAddress ??
        "Collaborator",
      avatar: user?.imageUrl ?? "",
    },
  });

  session.allow(`org:${orgId}:project:*`, ["*:write"]);

  const { status, body } = await session.authorize();

  return new Response(body, { status });
}