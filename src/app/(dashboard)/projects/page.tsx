import type { Metadata } from "next";

import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { ProjectsView } from "@/features/projects/views/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  prefetch(trpc.projects.getAll.queryOptions());

  return (
    <HydrateClient>
      <ProjectsView />
    </HydrateClient>
  );
}