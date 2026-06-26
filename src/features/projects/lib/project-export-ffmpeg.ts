import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";

import { env } from "../../../lib/env";

export class ProjectExportFfmpegError extends Error {
  constructor(
    message: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "ProjectExportFfmpegError";
  }
}

export function getProjectExportFfmpegPathCandidates({
  envPath = env.FFMPEG_PATH,
  staticPath = ffmpegStaticPath,
  commandPath = "ffmpeg",
}: {
  envPath?: string;
  staticPath?: string | null;
  commandPath?: string;
} = {}) {
  const candidates = [envPath, staticPath, commandPath].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  return Array.from(new Set(candidates));
}

export function getFfmpegPath() {
  return getProjectExportFfmpegPathCandidates()[0];
}

export function buildProjectExportFfmpegArgs({
  inputPaths,
  filter,
  outputLabel,
  outputPath,
}: {
  inputPaths: string[];
  filter: string;
  outputLabel: string;
  outputPath: string;
}) {
  return [
    "-y",
    ...inputPaths.flatMap((inputPath) => ["-i", inputPath]),
    "-filter_complex",
    filter,
    "-map",
    outputLabel,
    "-ac",
    "2",
    "-ar",
    "44100",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ];
}

export async function runProjectExportFfmpeg({
  ffmpegPath,
  inputPaths,
  filter,
  outputLabel,
  outputPath,
}: {
  ffmpegPath?: string;
  inputPaths: string[];
  filter: string;
  outputLabel: string;
  outputPath: string;
}) {
  const args = buildProjectExportFfmpegArgs({
    inputPaths,
    filter,
    outputLabel,
    outputPath,
  });
  const candidates = ffmpegPath
    ? [ffmpegPath]
    : getProjectExportFfmpegPathCandidates();
  const missingCandidates: string[] = [];

  for (const candidate of candidates) {
    try {
      await runFfmpegCommand(candidate, args);
      return;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        missingCandidates.push(candidate);
        continue;
      }

      if (error instanceof ProjectExportFfmpegError) {
        throw error;
      }

      throw new ProjectExportFfmpegError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  throw new ProjectExportFfmpegError(
    `FFmpeg is not configured. Tried: ${missingCandidates.join(", ")}.`,
  );
}

async function runFfmpegCommand(ffmpegPath: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new ProjectExportFfmpegError(
          `FFmpeg export failed with exit code ${code ?? "unknown"}.`,
          stderr,
        ),
      );
    });
  });
}
