import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { createTRPCRouter, orgProcedure } from "../init";

const BLOCK_LOCK_TTL_MS = 2 * 60 * 1000;

function getLockExpiry() {
  return new Date(Date.now() + BLOCK_LOCK_TTL_MS);
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
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return project;
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
