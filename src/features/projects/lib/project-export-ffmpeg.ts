import { spawn } from "node:child_process";

export class ProjectExportFfmpegError extends Error {
  constructor(
    message: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "ProjectExportFfmpegError";
  }
}

export function getFfmpegPath() {
  return process.env.FFMPEG_PATH || "ffmpeg";
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
  ffmpegPath = getFfmpegPath(),
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

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new ProjectExportFfmpegError(
            "FFmpeg is not configured. Install ffmpeg or set FFMPEG_PATH.",
          ),
        );
        return;
      }

      reject(new ProjectExportFfmpegError(error.message));
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
