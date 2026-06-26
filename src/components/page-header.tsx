import type { ReactNode } from "react";
import { Headphones, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="ml-auto flex min-w-0 max-w-full items-center justify-end gap-3">
        {actions ?? <PageHeaderDefaultActions />}
      </div>
    </div>
  );
}

function PageHeaderDefaultActions() {
  return (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link
          href="mailto:apariciojohnclyde@gmail.com"
          aria-label="Send feedback"
        >
          <ThumbsUp />
          <span className="hidden lg:block">Feedback</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="mailto:apariciojohnclyde@gmail.com" aria-label="Need help">
          <Headphones />
          <span className="hidden lg:block">Need help?</span>
        </Link>
      </Button>
    </>
  );
}
