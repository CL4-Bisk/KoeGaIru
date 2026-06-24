"use client";

import { type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

import { initialPresence, RoomProvider } from "../lib/realtime";

type LobbyProviderProps = {
  projectId: string;
  children: ReactNode;
};

export function LobbyProvider({ projectId, children }: LobbyProviderProps) {
  const { isLoaded, orgId } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!orgId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Select an organization to open this collaborative project.
      </div>
    );
  }

  return (
    <RoomProvider
      id={`org:${orgId}:project:${projectId}`}
      initialPresence={initialPresence}
    >
      {children}
    </RoomProvider>
  );
}
