// src/app/(dashboard)/projects/[projectId]/page.tsx
import { ProjectDetailView } from "@/features/projects/views/projects-detail-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

// const demoBlocks = [
//   {
//     speaker: "Narrator",
//     text: "Welcome to KoeGaIru. This project combines multiple voice clips into one final audio.",
//     status: "Generated",
//   },
//   {
//     speaker: "Character A",
//     text: "Instead of exporting every line manually, each block can become one reusable audio clip.",
//     status: "Ready to generate",
//   },
//   {
//     speaker: "Character B",
//     text: "Later, everyone in the organization can collaborate on this same project.",
//     status: "Draft",
//   },
// ];

export default async function ProjectBasePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  prefetch(trpc.projects.getById.queryOptions({ id: projectId }));
  prefetch(trpc.voices.getAll.queryOptions());

  return (
    <HydrateClient>
      <ProjectDetailView projectId={projectId} />
    </HydrateClient>
  );
}
