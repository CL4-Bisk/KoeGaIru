"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRouter } from "@/trpc/routers/_app";

type Project = inferRouterOutputs<AppRouter>["projects"]["getById"];
type ProjectNotification = Project["notifications"][number];

export function ProjectNotificationsMenu({
  notifications,
  isMarkingRead,
  onOpen,
  onSelectBlock,
}: {
  notifications: ProjectNotification[];
  isMarkingRead: boolean;
  onOpen: () => void;
  onSelectBlock: (blockId: string) => void;
}) {
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          onOpen();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative"
        >
          <Bell className="size-4" />
          <span className="sr-only">Project notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <DropdownMenuLabel className="p-0">
            Project notifications
          </DropdownMenuLabel>
          {isMarkingRead && (
            <Badge variant="outline" className="text-[10px]">
              Syncing
            </Badge>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex cursor-pointer flex-col items-start gap-1 whitespace-normal p-3"
              onSelect={() => onSelectBlock(notification.blockId)}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <p className="text-sm font-medium">{notification.title}</p>
                {!notification.isRead && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {notification.body}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
