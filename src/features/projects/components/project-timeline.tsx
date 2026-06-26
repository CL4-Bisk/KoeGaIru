"use client";

import {
  type DragEvent,
  type PointerEvent,
  useEffect,
  useState,
} from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { AudioLines, Clock, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AppRouter } from "@/trpc/routers/_app";
import { getTimelineWaveformAudioUrl } from "../lib/timeline-waveform";
import {
  calculateTimelineDurationMs,
  calculateTimelineStartMs,
  formatTimelineTime,
  getBlockTimelineDurationMs,
  getTimelineLeftPercent,
  getTimelineWidthPercent,
  TIMELINE_DURATION_MS,
} from "../lib/timeline-position";
import { ProjectTimelineWaveform } from "./project-timeline-waveform";

type Project = inferRouterOutputs<AppRouter>["projects"]["getById"];
type ProjectBlock = Project["blocks"][number];

const TIMELINE_BLOCK_DRAG_TYPE = "application/x-koegairu-timeline-block";
const timelineMarks = [0, 30000, 60000, 90000, 120000];

type ResizeState = {
  blockId: string;
  timelineStartMs: number;
  durationMs: number;
  trackLeft: number;
  trackWidth: number;
};

export function ProjectTimeline({
  blocks,
  selectedBlockId,
  draggingTimelineBlockId,
  isBusy,
  onSelectBlock,
  onDragStart,
  onDragEnd,
  onMoveBlock,
  onResizeBlock,
}: {
  blocks: ProjectBlock[];
  selectedBlockId: string | null;
  draggingTimelineBlockId: string | null;
  isBusy: boolean;
  onSelectBlock: (blockId: string) => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onMoveBlock: (blockId: string, timelineStartMs: number) => void;
  onResizeBlock: (blockId: string, timelineDurationMs: number) => void;
}) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  useEffect(() => {
    if (!resizeState) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const durationMs = calculateTimelineDurationMs({
        clientX: event.clientX,
        trackLeft: resizeState.trackLeft,
        trackWidth: resizeState.trackWidth,
        timelineStartMs: resizeState.timelineStartMs,
        timelineDurationMs: TIMELINE_DURATION_MS,
      });

      setResizeState((current) =>
        current ? { ...current, durationMs } : current,
      );
    };

    const handlePointerUp = () => {
      onResizeBlock(resizeState.blockId, resizeState.durationMs);
      setResizeState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onResizeBlock, resizeState]);

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    blockId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TIMELINE_BLOCK_DRAG_TYPE, blockId);
    onDragStart(blockId);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    fallbackBlockId: string,
  ) => {
    event.preventDefault();

    const blockId =
      event.dataTransfer.getData(TIMELINE_BLOCK_DRAG_TYPE) ||
      draggingTimelineBlockId;

    if (!blockId) {
      onDragEnd();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const timelineStartMs = calculateTimelineStartMs({
      clientX: event.clientX,
      trackLeft: rect.left,
      trackWidth: rect.width,
      timelineDurationMs: TIMELINE_DURATION_MS,
    });

    onMoveBlock(blockId || fallbackBlockId, timelineStartMs);
  };

  const handleResizeStart = (
    event: PointerEvent<HTMLButtonElement>,
    block: ProjectBlock,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const track = event.currentTarget.closest("[data-timeline-track]");

    if (!(track instanceof HTMLElement)) {
      return;
    }

    const rect = track.getBoundingClientRect();
    setResizeState({
      blockId: block.id,
      timelineStartMs: block.timelineStartMs,
      durationMs: getBlockTimelineDurationMs(block.timelineDurationMs),
      trackLeft: rect.left,
      trackWidth: rect.width,
    });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-col gap-1 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <p className="text-xs text-muted-foreground">
            Drag a clip horizontally to set its start time.
          </p>
        </div>
        <Badge variant="outline">2 min window</Badge>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-2 pb-2">
            <div />
            <div className="relative h-5">
              {timelineMarks.map((mark) => (
                <div
                  key={mark}
                  className="absolute top-0 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{
                    left: `${getTimelineLeftPercent(mark)}%`,
                  }}
                >
                  {formatTimelineTime(mark)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {blocks.map((block, index) => {
              const left = getTimelineLeftPercent(block.timelineStartMs);
              const durationMs =
                resizeState?.blockId === block.id
                  ? resizeState.durationMs
                  : getBlockTimelineDurationMs(block.timelineDurationMs);
              const width = getTimelineWidthPercent(durationMs);
              const isSelected = selectedBlockId === block.id;
              const isDragging = draggingTimelineBlockId === block.id;
              const isResizing = resizeState?.blockId === block.id;
              const waveformAudioUrl = getTimelineWaveformAudioUrl(
                block.generation,
              );

              return (
                <div
                  key={block.id}
                  className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3"
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => onSelectBlock(block.id)}
                  >
                    {block.generation ? (
                      <AudioLines className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">Block {index + 1}</span>
                  </button>

                  <div
                    data-timeline-track
                    className={`relative h-12 rounded-md border bg-muted/30 ${
                      isSelected ? "border-primary/60" : ""
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => handleDrop(event, block.id)}
                  >
                    {timelineMarks.map((mark) => (
                      <div
                        key={mark}
                        className="absolute inset-y-0 w-px bg-border"
                        style={{
                          left: `${getTimelineLeftPercent(mark)}%`,
                        }}
                      />
                    ))}

                    <div
                      className={`absolute top-1/2 flex h-8 min-w-16 max-w-none -translate-y-1/2 overflow-hidden rounded-md text-sm font-medium shadow-xs transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      } ${
                        isBusy ? "pointer-events-none opacity-50" : ""
                      } ${
                        isDragging ? "opacity-50" : ""
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      {waveformAudioUrl && (
                        <ProjectTimelineWaveform
                          audioUrl={waveformAudioUrl}
                          isSelected={isSelected}
                        />
                      )}
                      <button
                        type="button"
                        draggable={!isBusy && !isResizing}
                        className="relative z-10 flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 active:cursor-grabbing"
                        onClick={() => onSelectBlock(block.id)}
                        onDragStart={(event) =>
                          handleDragStart(event, block.id)
                        }
                        onDragEnd={onDragEnd}
                      >
                        <GripVertical className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {formatTimelineTime(block.timelineStartMs)}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] opacity-80">
                          {formatTimelineTime(durationMs)}
                        </span>
                        <span className="sr-only">
                          Duration {formatTimelineTime(durationMs)}
                        </span>
                      </button>
                      <span
                        aria-hidden="true"
                        className="my-auto h-5 w-px shrink-0 bg-current/30"
                      />
                      <button
                        type="button"
                        className="relative z-10 h-6 w-3 shrink-0 cursor-ew-resize rounded-sm hover:bg-background/20"
                        disabled={isBusy}
                        onPointerDown={(event) =>
                          handleResizeStart(event, block)
                        }
                      >
                        <span className="sr-only">Resize clip duration</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
