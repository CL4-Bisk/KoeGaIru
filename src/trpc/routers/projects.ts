import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

const BLOCK_LOCK_TTL_MS = 2 * 60 * 1000;

function getLockExpiry() {
  return new Date(Date.now() + BLOCK_LOCK_TTL_MS);
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
                  temperature: true,
                  topP: true,
                  topK: true,
                  repetitionPenalty: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...project,
        blocks: project.blocks.map((block) => ({
          ...block,
          generation: block.generation
            ? {
                ...block.generation,
                audioUrl: `/api/audio/${block.generation.id}`,
              }
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
            revision: true,
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
      await ensureEditableBlock(input.blockId, ctx.orgId, ctx.userId);

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

        return prisma.projectBlock.update({
          where: { id: block.id },
          data: {
            generationId: generation.id,
            status: "GENERATED",
            revision: { increment: 1 },
            lockExpiresAt: getLockExpiry(),
          },
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
        timelineStartMs: z.number().int().min(0).max(10 * 60 * 1000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
          timelineStartMs: input.timelineStartMs,
        },
      });
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
