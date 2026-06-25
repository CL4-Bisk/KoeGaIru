"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { ProjectCreateDialog } from "@/features/projects/components/project-create-dialog";

function ProjectsContent() {
    const trpc = useTRPC();
    const { data: projects } = useSuspenseQuery(
    trpc.projects.getAll.queryOptions(),
    );

    return (
    <div className="grid grid-cols-2 gap-4">
        {projects.length > 0 ? (
            <div className="grid gap-3">
                {projects.map((project) => (
                <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="rounded-lg border bg-background p-5 shadow-sm transition hover:bg-muted/50"
                >
                    <h2 className="font-medium">{project.name}</h2>
                    {project.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {project.description}
                    </p>
                    )}
                </Link>
                ))}
            </div>
            ) : (
            <div className="rounded-lg border border-dashed bg-background p-6">
                <p className="text-sm font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                Create your first shared voice project for this organization.
                </p>
            </div>
            )
        }
    </div>
    );
}


export function ProjectsView() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Create shared voice projects for this organization.
        </p>
      </div>

      <ProjectCreateDialog>
        <Button>
            <Plus className="size-4" />
            Create project
        </Button>
     </ProjectCreateDialog>

      <ProjectsContent />
      
    </div>
  );
}