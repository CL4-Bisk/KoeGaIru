"use client";

import { MousePointer2 } from "lucide-react";

import { useOthers } from "../lib/realtime";

const cursorColors = [
  "text-sky-500",
  "text-emerald-500",
  "text-amber-500",
  "text-rose-500",
  "text-cyan-500",
];

export function LiveCursors() {
  const cursors = useOthers((others) =>
    others
      .map((user) => ({
        connectionId: user.connectionId,
        cursor: user.presence.cursor,
        name: user.info?.name ?? "Collaborator",
      }))
      .filter((user) => user.cursor !== null),
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {cursors.map((user, index) => (
        <div
          key={user.connectionId}
          className="absolute flex items-start gap-1"
          style={{
            transform: `translate(${user.cursor?.x ?? 0}px, ${
              user.cursor?.y ?? 0
            }px)`,
          }}
        >
          <MousePointer2
            className={`size-4 fill-current ${
              cursorColors[index % cursorColors.length]
            }`}
          />
          <span className="rounded bg-background px-1.5 py-0.5 text-xs font-medium shadow">
            {user.name}
          </span>
        </div>
      ))}
    </div>
  );
}
