import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl, uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import {
  ProjectExportFfmpegError,
  runProjectExportFfmpeg,
} from "@/features/projects/lib/project-export-ffmpeg";
import {
  buildProjectExportMixFilter,
  getExportableTimelineBlocks,
  getProjectExportDurationMs,
} from "@/features/projects/lib/project-export-plan";
import {
  getProjectBlockAudioState,
  getRestoreProjectBlockGenerationData,
} from "@/features/projects/lib/project-audio-state";
import {
  getProjectExportSourceHash,
  isProjectExportLatest,
} from "@/features/projects/lib/project-export-source";
import { getProjectCommentCreateData } from "@/features/projects/lib/project-comments";
import { createTRPCRouter, orgProcedure } from "../init";

const BLOCK_LOCK_TTL_MS = 2 * 60 * 1000;

function getLockExpiry() {
  return new Date(Date.now() + BLOCK_LOCK_TTL_MS);
}

function getProjectExportDownloadUrl(exportId: string) {
  return `/api/project-exports/${exportId}`;
}

function getSafeExportFileName(projectName: string) {
  const safeName =
    projectName
      .slice(0, 50)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "project-export";

  return `${safeName}.wav`;
}

async function downloadAudioToFile(r2ObjectKey: string, filePath: string) {
  const signedUrl = await getSignedAudioUrl(r2ObjectKey);
  const audioResponse = await fetch(signedUrl);

  if (!audioResponse.ok) {
    throw new Error("Failed to download project block audio from R2.");
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  await writeFile(filePath, audioBuffer);
}

async function getCommentAuthorName(userId: string) {
  const user = await currentUser().catch(() => null);

  return (
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    userId
  );
}

async function ensureEditableBlock(blockId: string, orgId: string, userId: string) {
  const now = new Date();
  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      project: {
        orgId,
      },
    },
    select: {
      id: true,
      text: true,
      voiceId: true,
      generationId: true,
      lockOwnerId: true,
      lockExpiresAt: true,
    },
  });

  if (!block) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (
    block.lockOwnerId !== userId ||
    !block.lockExpiresAt ||
    block.lockExpiresAt <= now
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You need the active edit lock before changing this block.",
    });
  }

  return block;
}

export const projectsRouter = createTRPCRouter({
  getAll: orgProcedure.query(async ({ ctx }) => {
    return prisma.project.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findUnique({
        where: {
          id: input.id,
          orgId: ctx.orgId,
        },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: {
              voice: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  language: true,
                  variant: true,
                },
              },
              generation: {
                select: {
                  id: true,
                  text: true,
                  voiceId: true,
                  voiceName: true,
                  r2ObjectKey: true,
                  temperature: true,
                  topP: true,
                  topK: true,
                  repetitionPenalty: true,
                  createdAt: true,
                },
              },
              generationHistory: {
                orderBy: { createdAt: "desc" },
                take: 8,
                include: {
                  generation: {
                    select: {
                      id: true,
                      text: true,
                      voiceId: true,
                      voiceName: true,
                      r2ObjectKey: true,
                      temperature: true,
                      topP: true,
                      topK: true,
                      repetitionPenalty: true,
                      createdAt: true,
                    },
                  },
                },
              },
              comments: {
                orderBy: { createdAt: "desc" },
                take: 50,
              },
            },
          },
          exports: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const currentExportSourceHash = getProjectExportSourceHash(project.blocks);

      return {
        ...project,
        blocks: project.blocks.map((block) => {
          const audioState = getProjectBlockAudioState(block);

          return {
            ...block,
            audioState,
            generation: block.generation
              ? {
                  id: block.generation.id,
                  text: block.generation.text,
                  voiceId: block.generation.voiceId,
                  voiceName: block.generation.voiceName,
                  temperature: block.generation.temperature,
                  topP: block.generation.topP,
                  topK: block.generation.topK,
                  repetitionPenalty: block.generation.repetitionPenalty,
                  createdAt: block.generation.createdAt,
                  audioUrl: `/api/audio/${block.generation.id}`,
                }
              : null,
            generationHistory: block.generationHistory.map((history) => ({
              id: history.id,
              createdAt: history.createdAt,
              isCurrent: history.generation.id === block.generationId,
              generation: {
                id: history.generation.id,
                text: history.generation.text,
                voiceId: history.generation.voiceId,
                voiceName: history.generation.voiceName,
                temperature: history.generation.temperature,
                topP: history.generation.topP,
                topK: history.generation.topK,
                repetitionPenalty: history.generation.repetitionPenalty,
                createdAt: history.generation.createdAt,
                audioUrl: `/api/audio/${history.generation.id}`,
              },
            })),
          };
        }),
        exports: project.exports.map((projectExport) => ({
          ...projectExport,
          isLatest:
            projectExport.status === "READY" &&
            isProjectExportLatest(
              projectExport.sourceHash,
              currentExportSourceHash,
            ),
          audioUrl:
            projectExport.status === "READY" && projectExport.r2ObjectKey
              ? getProjectExportDownloadUrl(projectExport.id)
              : null,
        })),
      };
    }),

  create: orgProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(240).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.project.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          description: input.description,
        },
      });
    }),

  createBlock: orgProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        text: z.string().trim().min(1).max(5000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.$transaction(async (tx) => {
        const project = await tx.project.findFirst({
          where: {
            id: input.projectId,
            orgId: ctx.orgId,
          },
          select: { id: true },
        });

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const lastBlock = await tx.projectBlock.findFirst({
          where: { projectId: input.projectId },
          orderBy: { order: "desc" },
          select: { order: true },
        });

        return tx.projectBlock.create({
          data: {
            projectId: input.projectId,
            text: input.text,
            order: (lastBlock?.order ?? -1) + 1,
          },
        });
      });
    }),

  updateBlock: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        text: z.string().trim().min(1).max(5000),
        revision: z.number().int().min(1)
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date();

      const block = await prisma.projectBlock.findFirst({
        where: {
          id: input.blockId,
          project: {
            orgId: ctx.orgId,
          },
        },
          select: {
            id: true,
            text: true,
            revision: true,
            generationId: true,
            lockOwnerId: true,
            lockExpiresAt: true,
        },
      });

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (block.revision !== input.revision){
        throw new TRPCError({
            code: "CONFLICT",
            message: "This block changed. Refresh before saving.",
        });
      }

      if (
        block.lockOwnerId !== ctx.userId ||
        !block.lockExpiresAt ||
        block.lockExpiresAt <= now
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You need the active edit lock before saving this block.",
        });
      }

      return prisma.projectBlock.update({
        where: { id: input.blockId },
        data: {
            text: input.text,
            revision: { increment: 1 },
            lockExpiresAt: getLockExpiry(),
            ...(block.generationId && block.text !== input.text
              ? { status: "DRAFT" as const }
              : {}),
        },
      });
    }),

  updateBlockVoice: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        voiceId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const block = await ensureEditableBlock(
        input.blockId,
        ctx.orgId,
        ctx.userId,
      );

      const voice = await prisma.voice.findUnique({
        where: {
          id: input.voiceId,
          OR: [
            { variant: "SYSTEM" },
            { variant: "CUSTOM", orgId: ctx.orgId },
          ],
        },
        select: { id: true },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      return prisma.projectBlock.update({
        where: { id: input.blockId },
        data: {
          voiceId: voice.id,
          revision: { increment: 1 },
          lockExpiresAt: getLockExpiry(),
          ...(block.generationId && block.voiceId !== voice.id
            ? { status: "DRAFT" as const }
            : {}),
        },
      });
    }),

  generateBlockAudio: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const block = await ensureEditableBlock(input.blockId, ctx.orgId, ctx.userId);

      if (block.text.length > TEXT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Block text must be ${TEXT_MAX_LENGTH} characters or less.`,
        });
      }

      if (!block.voiceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select a voice before generating this block.",
        });
      }

      const voice = await prisma.voice.findUnique({
        where: {
          id: block.voiceId,
          OR: [
            { variant: "SYSTEM" },
            { variant: "CUSTOM", orgId: ctx.orgId },
          ],
        },
        select: {
          id: true,
          name: true,
          r2ObjectKey: true,
        },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      if (!voice.r2ObjectKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      await prisma.projectBlock.update({
        where: { id: block.id },
        data: {
          status: "GENERATING",
          lockExpiresAt: getLockExpiry(),
        },
      });

      let generationId: string | null = null;

      try {
        const { data, error } = await chatterbox.POST("/generate", {
          body: {
            prompt: block.text,
            voice_key: voice.r2ObjectKey,
            temperature: input.temperature,
            top_p: input.topP,
            top_k: input.topK,
            repetition_penalty: input.repetitionPenalty,
            norm_loudness: true,
          },
          parseAs: "arrayBuffer",
        });

        Sentry.logger.info("Project block generation started", {
          orgId: ctx.orgId,
          blockId: block.id,
          voiceId: voice.id,
          textLength: block.text.length,
        });

        if (error || !(data instanceof ArrayBuffer)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate audio",
          });
        }

        const generation = await prisma.generation.create({
          data: {
            orgId: ctx.orgId,
            text: block.text,
            voiceName: voice.name,
            voiceId: voice.id,
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            repetitionPenalty: input.repetitionPenalty,
          },
          select: { id: true },
        });

        generationId = generation.id;
        const r2ObjectKey = `generations/orgs/${ctx.orgId}/${generation.id}`;
        await uploadAudio({
          buffer: Buffer.from(data),
          key: r2ObjectKey,
        });

        await prisma.generation.update({
          where: { id: generation.id },
          data: { r2ObjectKey },
        });

        return prisma.$transaction(async (tx) => {
          await tx.projectBlockGeneration.upsert({
            where: {
              blockId_generationId: {
                blockId: block.id,
                generationId: generation.id,
              },
            },
            create: {
              blockId: block.id,
              generationId: generation.id,
            },
            update: {},
          });

          return tx.projectBlock.update({
            where: { id: block.id },
            data: {
              generationId: generation.id,
              status: "GENERATED",
              revision: { increment: 1 },
              lockExpiresAt: getLockExpiry(),
            },
          });
        });
      } catch (error) {
        if (generationId) {
          await prisma.generation
            .delete({
              where: { id: generationId },
            })
            .catch(() => {});
        }

        await prisma.projectBlock
          .update({
            where: { id: block.id },
            data: { status: "FAILED" },
          })
          .catch(() => {});

        Sentry.logger.error("Project block generation failed", {
          orgId: ctx.orgId,
          blockId: block.id,
          voiceId: voice.id,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }
    }),

  restoreBlockGeneration: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        historyId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureEditableBlock(input.blockId, ctx.orgId, ctx.userId);

      const history = await prisma.projectBlockGeneration.findFirst({
        where: {
          id: input.historyId,
          blockId: input.blockId,
          block: {
            project: {
              orgId: ctx.orgId,
            },
          },
        },
        include: {
          generation: {
            select: {
              id: true,
              text: true,
              voiceId: true,
            },
          },
        },
      });

      if (!history) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audio history item not found.",
        });
      }

      return prisma.projectBlock.update({
        where: { id: input.blockId },
        data: {
          ...getRestoreProjectBlockGenerationData(history.generation),
          revision: { increment: 1 },
          lockExpiresAt: getLockExpiry(),
        },
      });
    }),

  reorderBlocks: orgProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        blockIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uniqueBlockIds = new Set(input.blockIds);

      if (uniqueBlockIds.size !== input.blockIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Block order contains duplicate blocks.",
        });
      }

      return prisma.$transaction(async (tx) => {
        const project = await tx.project.findFirst({
          where: {
            id: input.projectId,
            orgId: ctx.orgId,
          },
          select: { id: true },
        });

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const blocks = await tx.projectBlock.findMany({
          where: {
            projectId: input.projectId,
            project: {
              orgId: ctx.orgId,
            },
          },
          select: { id: true },
        });

        const projectBlockIds = new Set(blocks.map((block) => block.id));
        const orderMatchesProject =
          blocks.length === input.blockIds.length &&
          input.blockIds.every((blockId) => projectBlockIds.has(blockId));

        if (!orderMatchesProject) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Block order is stale. Refresh before reordering.",
          });
        }

        await Promise.all(
          input.blockIds.map((blockId, order) =>
            tx.projectBlock.update({
              where: { id: blockId },
              data: { order },
            }),
          ),
        );

        return { success: true };
      });
    }),

  updateBlockTimeline: orgProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        blockId: z.string().min(1),
        timelineStartMs: z.number().int().min(0).max(10 * 60 * 1000).optional(),
        timelineDurationMs: z
          .number()
          .int()
          .min(500)
          .max(10 * 60 * 1000)
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        input.timelineStartMs === undefined &&
        input.timelineDurationMs === undefined
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No timeline changes provided.",
        });
      }

      const block = await prisma.projectBlock.findFirst({
        where: {
          id: input.blockId,
          projectId: input.projectId,
          project: {
            orgId: ctx.orgId,
          },
        },
        select: { id: true },
      });

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.projectBlock.update({
        where: { id: block.id },
        data: {
          ...(input.timelineStartMs !== undefined
            ? { timelineStartMs: input.timelineStartMs }
            : {}),
          ...(input.timelineDurationMs !== undefined
            ? { timelineDurationMs: input.timelineDurationMs }
            : {}),
        },
      });
    }),

  exportProjectAudio: orgProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          orgId: ctx.orgId,
        },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: {
              generation: {
                select: {
                  id: true,
                  text: true,
                  voiceId: true,
                  r2ObjectKey: true,
                },
              },
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const exportableBlocks = getExportableTimelineBlocks(project.blocks);
      const staleBlocks = project.blocks.filter(
        (block) => getProjectBlockAudioState(block) === "STALE",
      );

      if (staleBlocks.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "One or more blocks need regeneration before exporting this project.",
        });
      }

      if (exportableBlocks.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Generate at least one block before exporting this project.",
        });
      }

      const projectExport = await prisma.projectExport.create({
          data: {
            projectId: project.id,
            fileName: getSafeExportFileName(project.name),
            sourceHash: getProjectExportSourceHash(project.blocks),
          },
        });
      const tempDir = await mkdtemp(
        path.join(os.tmpdir(), `koegairu-export-${projectExport.id}-`),
      );

      try {
        const inputPaths = exportableBlocks.map((block, index) =>
          path.join(tempDir, `block-${index}.wav`),
        );
        await Promise.all(
          exportableBlocks.map((block, index) =>
            downloadAudioToFile(block.r2ObjectKey, inputPaths[index]),
          ),
        );

        const outputPath = path.join(tempDir, "project-export.wav");
        const { filter, outputLabel } =
          buildProjectExportMixFilter(exportableBlocks);

        await runProjectExportFfmpeg({
          inputPaths,
          filter,
          outputLabel,
          outputPath,
        });

        const outputBuffer = await readFile(outputPath);
        const r2ObjectKey = `project-exports/orgs/${ctx.orgId}/projects/${project.id}/${projectExport.id}.wav`;

        await uploadAudio({
          buffer: outputBuffer,
          key: r2ObjectKey,
          contentType: "audio/wav",
        });

        const updatedExport = await prisma.projectExport.update({
          where: { id: projectExport.id },
          data: {
            status: "READY",
            r2ObjectKey,
            durationMs: getProjectExportDurationMs(exportableBlocks),
          },
        });

        return {
          ...updatedExport,
          audioUrl: getProjectExportDownloadUrl(updatedExport.id),
        };
      } catch (error) {
        const message =
          error instanceof ProjectExportFfmpegError
            ? error.message
            : "Failed to export project audio.";

        await prisma.projectExport
          .update({
            where: { id: projectExport.id },
            data: {
              status: "FAILED",
              errorMessage: message,
            },
          })
          .catch(() => {});

        Sentry.logger.error("Project export failed", {
          orgId: ctx.orgId,
          projectId: project.id,
          exportId: projectExport.id,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                }
              : { message: String(error) },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    }),

  deleteBlock: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const block = await prisma.projectBlock.findFirst({
        where: {
          id: input.blockId,
          project: {
            orgId: ctx.orgId,
          },
        },
        select: { id: true },
      });

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.projectBlock.delete({
        where: { id: input.blockId },
      });
    }),

  createBlockComment: orgProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        body: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const block = await prisma.projectBlock.findFirst({
        where: {
          id: input.blockId,
          project: {
            orgId: ctx.orgId,
          },
        },
        select: { id: true },
      });

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.projectComment.create({
        data: getProjectCommentCreateData({
          blockId: block.id,
          orgId: ctx.orgId,
          authorId: ctx.userId,
          authorName: await getCommentAuthorName(ctx.userId),
          body: input.body,
        }),
      });
    }),

  setBlockCommentResolved: orgProcedure
    .input(
      z.object({
        commentId: z.string().min(1),
        isResolved: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const comment = await prisma.projectComment.findFirst({
        where: {
          id: input.commentId,
          orgId: ctx.orgId,
        },
        select: { id: true },
      });

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.projectComment.update({
        where: { id: comment.id },
        data: { isResolved: input.isResolved },
      });
    }),

  acquireBlockLock: orgProcedure
    .input(z.object({ blockId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
        return prisma.$transaction(async (tx) => {
        const block = await tx.projectBlock.findFirst({
            where: {
            id: input.blockId,
            project: { orgId: ctx.orgId },
            },
        });

        if (!block) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        const now = new Date();
        const lockIsActive =
            block.lockOwnerId &&
            block.lockOwnerId !== ctx.userId &&
            block.lockExpiresAt &&
            block.lockExpiresAt > now;

        if (lockIsActive) {
            throw new TRPCError({
            code: "CONFLICT",
            message: "This block is being edited by another collaborator.",
            });
        }

        return tx.projectBlock.update({
            where: { id: block.id },
            data: {
            lockOwnerId: ctx.userId,
            lockedAt: now,
            lockExpiresAt: getLockExpiry(),
            status: "EDITING",
            },
        });
        });
    }),

  releaseBlockLock: orgProcedure
    .input(z.object({ blockId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
        return prisma.projectBlock.updateMany({
        where: {
            id: input.blockId,
            lockOwnerId: ctx.userId,
            project: { orgId: ctx.orgId },
        },
        data: {
            lockOwnerId: null,
            lockedAt: null,
            lockExpiresAt: null,
            status: "DRAFT",
        },
        });
    }),
});
