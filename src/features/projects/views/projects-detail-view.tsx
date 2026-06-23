"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

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

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const trpc = useTRPC();

  const { data: project } = useSuspenseQuery(
    trpc.projects.getById.queryOptions({ id: projectId }),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>

        {project.description && (
          <p className="text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>
    </div>
    // <div className="flex flex-1 flex-col gap-6 p-6">
    //   <div>
    //     <p className="text-sm text-muted-foreground">Project / {projectId}</p>
    //     <h1 className="text-2xl font-semibold tracking-tight">
    //       Demo voice project
    //     </h1>
    //   </div>

    //   <div className="grid gap-4">
    //     {demoBlocks.map((block, index) => (
    //       <div key={index} className="rounded-lg border bg-background p-5">
    //         <div className="mb-3 flex items-center justify-between">
    //           <p className="text-sm font-medium">{block.speaker}</p>
    //           <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
    //             {block.status}
    //           </span>
    //         </div>

    //         <p className="text-sm leading-6 text-muted-foreground">
    //           {block.text}
    //         </p>

    //         <div className="mt-4 h-10 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
    //           Audio clip preview placeholder
    //         </div>
    //       </div>
    //     ))}
    //   </div>
    // </div>
  );
}