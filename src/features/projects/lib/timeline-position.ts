export const TIMELINE_DURATION_MS = 120000;
export const TIMELINE_SNAP_MS = 500;
export const DEFAULT_BLOCK_DURATION_MS = 3000;
export const MIN_BLOCK_DURATION_MS = 500;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateTimelineStartMs({
  clientX,
  trackLeft,
  trackWidth,
  timelineDurationMs = TIMELINE_DURATION_MS,
  snapMs = TIMELINE_SNAP_MS,
}: {
  clientX: number;
  trackLeft: number;
  trackWidth: number;
  timelineDurationMs?: number;
  snapMs?: number;
}) {
  if (trackWidth <= 0) {
    return 0;
  }

  const ratio = clamp((clientX - trackLeft) / trackWidth, 0, 1);
  const rawMs = ratio * timelineDurationMs;

  return clamp(Math.round(rawMs / snapMs) * snapMs, 0, timelineDurationMs);
}

export function getTimelineLeftPercent(
  timelineStartMs: number,
  timelineDurationMs = TIMELINE_DURATION_MS,
) {
  if (timelineDurationMs <= 0) {
    return 0;
  }

  return clamp((timelineStartMs / timelineDurationMs) * 100, 0, 100);
}

export function getBlockTimelineDurationMs(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) {
    return DEFAULT_BLOCK_DURATION_MS;
  }

  return Math.max(durationMs, MIN_BLOCK_DURATION_MS);
}

export function getTimelineWidthPercent(
  durationMs: number,
  timelineDurationMs = TIMELINE_DURATION_MS,
) {
  if (timelineDurationMs <= 0) {
    return 0;
  }

  return clamp((durationMs / timelineDurationMs) * 100, 0, 100);
}

export function calculateTimelineDurationMs({
  clientX,
  trackLeft,
  trackWidth,
  timelineStartMs,
  timelineDurationMs = TIMELINE_DURATION_MS,
  snapMs = TIMELINE_SNAP_MS,
}: {
  clientX: number;
  trackLeft: number;
  trackWidth: number;
  timelineStartMs: number;
  timelineDurationMs?: number;
  snapMs?: number;
}) {
  if (trackWidth <= 0) {
    return MIN_BLOCK_DURATION_MS;
  }

  const ratio = clamp((clientX - trackLeft) / trackWidth, 0, 1);
  const endMs = ratio * timelineDurationMs;
  const rawDurationMs = Math.max(endMs - timelineStartMs, MIN_BLOCK_DURATION_MS);
  const snappedDurationMs = Math.round(rawDurationMs / snapMs) * snapMs;
  const maxDurationMs = Math.max(
    timelineDurationMs - timelineStartMs,
    MIN_BLOCK_DURATION_MS,
  );

  return clamp(snappedDurationMs, MIN_BLOCK_DURATION_MS, maxDurationMs);
}

export function formatTimelineTime(ms: number) {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds % 1 === 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}
