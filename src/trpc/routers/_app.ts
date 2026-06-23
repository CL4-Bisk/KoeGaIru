import { createTRPCRouter } from '../init';
import { billingRouter } from './billing';
import { generationsRouter } from './generations';
import { voicesRouter } from './voices';
import { projectsRouter } from './projects';

export const appRouter = createTRPCRouter({
  voices: voicesRouter,
  generations: generationsRouter,
  billing: billingRouter,
  projects: projectsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;