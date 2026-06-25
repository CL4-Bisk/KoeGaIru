"use client";

import { type ReactNode, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { initialPresence, RoomProvider } from "../lib/realtime";

type LobbyProviderProps = {
  projectId: string;
  children: ReactNode;
};

const LIVEBLOCKS_BRANDING_SELECTORS = [
  ".lb-composer-attribution",
  "#liveblocks-badge",
  "#liveblocks-badge-hide-button",
  'a[href="https://lblcks.io/badge"]',
];

export function LobbyProvider({ projectId, children }: LobbyProviderProps) {
  const { isLoaded, orgId } = useAuth();

  useEffect(() => {
    const hideLiveblocksBranding = () => {
      for (const selector of LIVEBLOCKS_BRANDING_SELECTORS) {
        for (const element of document.querySelectorAll(selector)) {
          element.setAttribute("hidden", "");

          if (element instanceof HTMLElement) {
            element.style.setProperty("display", "none", "important");
            element.style.setProperty("visibility", "hidden", "important");
            element.style.setProperty("pointer-events", "none", "important");
          }
        }
      }
    };

    hideLiveblocksBranding();

    if (!document.body) {
      return;
    }

    const observer = new MutationObserver(hideLiveblocksBranding);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

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
