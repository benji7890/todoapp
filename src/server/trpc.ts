import { initTRPC } from '@trpc/server';
import { MikroORM } from '@mikro-orm/core';
import { documentsRouter } from './routes/documents';
import { todosRouter } from './routes/todos';

export interface Context {
  orm: MikroORM;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export function createAppRouter() {
  return router({
    hello: publicProcedure.query(() => {
      return { message: 'Hello World!' };
    }),

    documents: documentsRouter,
    todos: todosRouter,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;