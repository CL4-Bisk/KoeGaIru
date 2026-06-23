// src/app/(dashboard)/projects/page.tsx
import Link from "next/link";

export default function ProjectsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Create shared voice projects for this organization.
        </p>
      </div>

      <Link
        href="/projects/demo"
        className="rounded-lg border bg-background p-5 shadow-sm transition hover:bg-muted/50"
      >
        <h2 className="font-medium">Demo voice project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Static workspace preview with script blocks and generated audio clips.
        </p>
      </Link>
    </div>
  );
}