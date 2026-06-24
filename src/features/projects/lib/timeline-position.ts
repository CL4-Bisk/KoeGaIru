export const TIMELINE_DURATION_MS = 120000;
export const TIMELINE_SNAP_MS = 500;

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

export function formatTimelineTime(ms: number) {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds % 1 === 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}
