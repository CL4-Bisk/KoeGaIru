import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exportId: string }> },
) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { exportId } = await params;
  const projectExport = await prisma.projectExport.findFirst({
    where: {
      id: exportId,
      project: {
        orgId,
      },
    },
  });

  if (!projectExport) {
    return new Response("Not found", { status: 404 });
  }

  if (projectExport.status !== "READY" || !projectExport.r2ObjectKey) {
    return new Response("Project export is not ready yet", { status: 409 });
  }

  const signedUrl = await getSignedAudioUrl(projectExport.r2ObjectKey);
  const audioResponse = await fetch(signedUrl);

  if (!audioResponse.ok) {
    return new Response("Failed to fetch project export", { status: 502 });
  }

  return new Response(audioResponse.body, {
    headers: {
      "Content-Type": projectExport.contentType,
      "Content-Disposition": `attachment; filename="${projectExport.fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
