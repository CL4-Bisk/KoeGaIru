"use client";

import { AudioWaveform } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useWaveSurfer } from "@/features/text-to-speech/hooks/use-wavesurfer";
import { cn } from "@/lib/utils";

export function ProjectTimelineWaveform({
  audioUrl,
  isSelected,
}: {
  audioUrl: string;
  isSelected: boolean;
}) {
  const { containerRef, isReady } = useWaveSurfer({
    url: audioUrl,
    autoplay: false,
  });

  return (
    <div
      className="pointer-events-none absolute inset-y-1 left-8 right-12 overflow-hidden rounded-sm"
      aria-hidden="true"
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner
            className={cn(
              "size-3",
              isSelected ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          />
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          "h-full opacity-55 transition-opacity",
          !isReady && "opacity-0",
        )}
      />
      {!isReady && (
        <AudioWaveform
          className={cn(
            "absolute left-2 top-1/2 size-4 -translate-y-1/2 opacity-40",
            isSelected ? "text-primary-foreground" : "text-muted-foreground",
          )}
        />
      )}
    </div>
  );
}
