"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOthers, useSelf, useStatus } from "../lib/realtime";

function getInitials(name?: string) {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ActiveCollaborators() {
  const self = useSelf();
  const others = useOthers();
  const status = useStatus();
  const collaborators = self ? [self, ...others] : [...others];

  return (
    <div className="flex items-center gap-3">
      <AvatarGroup>
        {collaborators.slice(0, 5).map((user) => {
          const name = user.info?.name;

          return (
            <Avatar key={user.connectionId} size="sm" title={name}>
              {user.info?.avatar && (
                <AvatarImage src={user.info.avatar} alt={name ?? ""} />
              )}
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
          );
        })}
      </AvatarGroup>

      <Badge variant={status === "connected" ? "default" : "outline"}>
        {status === "connected"
          ? `${collaborators.length} live`
          : "Connecting"}
      </Badge>
    </div>
  );
}
