"use client";

import { useState } from "react";
import { Download, Pause, Play, Redo, Undo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { useWaveSurfer } from "@/features/text-to-speech/hooks/use-wavesurfer";
import { cn } from "@/lib/utils";

type ProjectAudioPreviewVoice = {
  id?: string | null;
  name: string;
};

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function getDownloadName(text: string) {
  return (
    text
      .slice(0, 50)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "project-block"
  );
}

export function ProjectAudioPreview({
  audioUrl,
  text,
  voice,
  compact = false,
  className,
}: {
  audioUrl: string;
  text: string;
  voice: ProjectAudioPreviewVoice | null;
  compact?: boolean;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const {
    containerRef,
    isPlaying,
    isReady,
    currentTime,
    duration,
    togglePlayPause,
    seekBackward,
    seekForward,
  } = useWaveSurfer({
    url: audioUrl,
    autoplay: false,
  });

  const handleDownload = () => {
    setIsDownloading(true);

    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `${getDownloadName(text)}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background",
        compact ? "p-4" : "p-5",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "relative flex items-center justify-center",
          compact ? "h-24" : "h-32",
        )}
      >
        {!isReady && (
          <Badge
            variant="outline"
            className="absolute z-10 gap-2 bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
          >
            <Spinner className="size-3.5" />
            Loading audio...
          </Badge>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full cursor-pointer transition-opacity duration-200",
            !isReady && "opacity-0",
          )}
        />
      </div>

      <div className="flex items-center justify-center py-2">
        <p
          className={cn(
            "font-semibold tabular-nums tracking-tight text-foreground",
            compact ? "text-xl" : "text-2xl",
          )}
        >
          {formatTime(currentTime)}{" "}
          <span className="text-muted-foreground">
            / {formatTime(duration)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{text}</p>
          {voice && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <VoiceAvatar
                seed={voice.id ?? voice.name}
                name={voice.name}
                className="shrink-0"
              />
              <span className="truncate">{voice.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size={compact ? "icon-sm" : "icon-lg"}
            className="flex-col"
            disabled={!isReady}
            onClick={() => seekBackward(10)}
          >
            <Undo className="size-4 -mb-1" />
            <span className="text-[10px] font-medium">10</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size={compact ? "icon-sm" : "icon-lg"}
            className="rounded-full"
            disabled={!isReady}
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="fill-background" />
            ) : (
              <Play className="fill-background" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={compact ? "icon-sm" : "icon-lg"}
            className="flex-col"
            disabled={!isReady}
            onClick={() => seekForward(10)}
          >
            <Redo className="size-4 -mb-1" />
            <span className="text-[10px] font-medium">10</span>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading}
            onClick={handleDownload}
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
