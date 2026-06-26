"use client";

import { createClient, type Json, type Lson } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export type CollaborationMode = "select" | "comment" | "generate";

export type CursorPosition = {
  [key: string]: Json | undefined;
  x: number;
  y: number;
};

export type CollaborationPresence = {
  [key: string]: Json | undefined;
  cursor: CursorPosition | null;
  selectedBlockId: string | null;
  editingBlockId: string | null;
  mode: CollaborationMode;
};

export type CollaborationStorage = {
  [key: string]: Lson | undefined;
};

export type CollaborationUserMeta = {
  id?: string;
  info?: {
    [key: string]: Json | undefined;
    name?: string;
    username?: string;
    avatar?: string;
  };
};

const client = createClient<CollaborationUserMeta>({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useOthers,
  useSelf,
  useStatus,
  useUpdateMyPresence,
} = createRoomContext<
  CollaborationPresence,
  CollaborationStorage,
  CollaborationUserMeta
>(client);

export const initialPresence: CollaborationPresence = {
  cursor: null,
  selectedBlockId: null,
  editingBlockId: null,
  mode: "select",
};
