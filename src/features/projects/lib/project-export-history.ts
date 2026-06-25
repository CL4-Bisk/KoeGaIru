type ProjectExportStatus = "PROCESSING" | "READY" | "FAILED";

function formatTimePart(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatProjectExportDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "Duration pending";
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${formatTimePart(minutes)}:${formatTimePart(seconds)}`;
  }

  return `${minutes}:${formatTimePart(seconds)}`;
}

export function getProjectExportVersionLabel({
  status,
  isLatest,
}: {
  status: ProjectExportStatus;
  isLatest: boolean;
}) {
  if (status === "READY") {
    return isLatest ? "Latest" : "Outdated";
  }

  if (status === "PROCESSING") {
    return "Processing";
  }

  return "Failed";
}
